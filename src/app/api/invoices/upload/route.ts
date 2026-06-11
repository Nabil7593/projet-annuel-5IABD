import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  TextractClient,
  AnalyzeDocumentCommand,
  Block,
} from "@aws-sdk/client-textract";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-3" });
// Textract Queries + Tables supported in eu-west-1 (closest to Paris)
const textract = new TextractClient({ region: "eu-west-1" });

// Natural-language questions for invoice header fields
const INVOICE_QUERIES = [
  { Text: "What is the supplier or company name?", Alias: "SUPPLIER" },
  { Text: "What is the invoice or order number?",  Alias: "INVOICE_NUMBER" },
  { Text: "What is the invoice date?",             Alias: "DATE" },
  { Text: "What is the total HT amount?",          Alias: "TOTAL_HT" },
  { Text: "What is the total TTC amount?",         Alias: "TOTAL_TTC" },
  { Text: "What is the TVA amount?",               Alias: "TVA" },
];

export type InvoiceItemInput = {
  description: string;
  quantity:   number | null;
  tvaRate:    number | null;
  unitPrice:  number | null;
  totalPrice: number;
};

// --- Query results ---

function parseQueryResults(blocks: Block[]): Record<string, string> {
  const blockMap: Record<string, Block> = {};
  for (const b of blocks) {
    if (b.Id) blockMap[b.Id] = b;
  }
  const results: Record<string, string> = {};
  for (const block of blocks) {
    if (block.BlockType === "QUERY" && block.Query?.Alias) {
      const answerId = block.Relationships?.find((r) => r.Type === "ANSWER")
        ?.Ids?.[0];
      if (answerId && blockMap[answerId]?.Text) {
        results[block.Query.Alias] = blockMap[answerId].Text!;
      }
    }
  }
  return results;
}

// --- Table parsing (line items) ---

function parseTableItems(blocks: Block[]): InvoiceItemInput[] {
  const blockMap: Record<string, Block> = {};
  for (const b of blocks) {
    if (b.Id) blockMap[b.Id] = b;
  }

  const getCellText = (cell: Block): string => {
    let text = "";
    for (const rel of cell.Relationships ?? []) {
      if (rel.Type === "CHILD") {
        for (const id of rel.Ids ?? []) {
          const child = blockMap[id];
          if (child?.BlockType === "WORD") text += (child.Text ?? "") + " ";
        }
      }
    }
    return text.trim();
  };

  const items: InvoiceItemInput[] = [];

  for (const tableBlock of blocks.filter((b) => b.BlockType === "TABLE")) {
    const cellIds =
      tableBlock.Relationships?.find((r) => r.Type === "CHILD")?.Ids ?? [];
    const cells = cellIds
      .map((id) => blockMap[id])
      .filter((b) => b?.BlockType === "CELL");

    // Build grid: rowIndex → colIndex → text (Textract indices are 1-based)
    const grid: Record<number, Record<number, string>> = {};
    for (const cell of cells) {
      const row = cell.RowIndex ?? 0;
      const col = cell.ColumnIndex ?? 0;
      if (!grid[row]) grid[row] = {};
      grid[row][col] = getCellText(cell);
    }

    const rows = Object.keys(grid)
      .map(Number)
      .sort((a, b) => a - b);
    if (rows.length < 2) continue;

    // Detect column roles from header row
    const headerRow = grid[rows[0]];
    const colMap: Record<string, number> = {};
    for (const [colStr, text] of Object.entries(headerRow)) {
      const col = Number(colStr);
      const h = text.toLowerCase();
      if (/quant|qté|qty/.test(h))                    colMap.qty   = col;
      if (/d[eé]sign|libellé|article|description/.test(h)) colMap.desc  = col;
      if (/^tva$/.test(h.trim()))                      colMap.tva   = col;
      if (/prix\s*u|unit|p\.u/.test(h))                colMap.unit  = col;
      if (/total/.test(h))                             colMap.total = col;
    }

    // Skip table if no description column found (probably a totals table)
    if (!colMap.desc) continue;

    const toFloat = (s: string | undefined): number | null => {
      if (!s) return null;
      const n = parseFloat(s.replace(/[^\d,.-]/g, "").replace(",", "."));
      return isNaN(n) ? null : n;
    };

    // Data rows (skip header)
    for (const rowIdx of rows.slice(1)) {
      const row = grid[rowIdx];
      const description = row[colMap.desc] ?? "";
      if (!description.trim()) continue;

      const totalPrice = toFloat(colMap.total ? row[colMap.total] : undefined) ?? 0;

      items.push({
        description,
        quantity:  toFloat(colMap.qty  ? row[colMap.qty]  : undefined),
        tvaRate:   toFloat(colMap.tva  ? row[colMap.tva]  : undefined),
        unitPrice: toFloat(colMap.unit ? row[colMap.unit] : undefined),
        totalPrice,
      });
    }
  }

  return items;
}

// --- Helpers ---

function cleanAmount(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^\d,.-]/g, "").replace(",", "."));
  return isNaN(n) || n === 0 ? null : n;
}

function parseDate(s: string | undefined): string {
  if (!s) return "";
  const frMonths: Record<string, string> = {
    janvier: "01", fevrier: "02", mars: "03", avril: "04",
    mai: "05", juin: "06", juillet: "07", aout: "08",
    septembre: "09", octobre: "10", novembre: "11", decembre: "12",
  };
  const norm = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const mText = s.match(
    /(?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+)?(\d{1,2})\s+(\S+)\s+(\d{4})/i
  );
  if (mText) {
    const month = frMonths[norm(mText[2])] ?? "01";
    return `${mText[3]}-${month}-${mText[1].padStart(2, "0")}`;
  }
  const mNum = s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (mNum) {
    return `${mNum[3]}-${mNum[2].padStart(2, "0")}-${mNum[1].padStart(2, "0")}`;
  }
  return s;
}

// --- Route ---

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Fichier PDF requis" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `factures/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

    // 1. Store PDF in S3
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_INVOICES_BUCKET ?? "restolens-factures-fournisseurs",
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );

    const pdfUrl = `https://${
      process.env.AWS_S3_INVOICES_BUCKET ?? "restolens-factures-fournisseurs"
    }.s3.${process.env.AWS_REGION ?? "eu-west-3"}.amazonaws.com/${key}`;

    // 2. Textract: QUERIES for header fields + TABLES for line items
    const textractResult = await textract.send(
      new AnalyzeDocumentCommand({
        Document: { Bytes: buffer },
        FeatureTypes: ["QUERIES", "TABLES"],
        QueriesConfig: { Queries: INVOICE_QUERIES },
      })
    );

    const blocks = textractResult.Blocks ?? [];

    const rawText = blocks
      .filter((b) => b.BlockType === "LINE")
      .map((b) => b.Text ?? "")
      .join("\n");

    // 3. Map results
    const q = parseQueryResults(blocks);
    const amountHT  = cleanAmount(q.TOTAL_HT);
    const amountTTC = cleanAmount(q.TOTAL_TTC);

    const extracted = {
      supplierName:  q.SUPPLIER       ?? "",
      invoiceNumber: q.INVOICE_NUMBER ?? "",
      date:          parseDate(q.DATE),
      amountHT,
      amountTTC,
      tva:           cleanAmount(q.TVA),
      totalAmount:   amountTTC ?? amountHT,
      items:         parseTableItems(blocks),
      rawText,
    };

    return NextResponse.json({ pdfUrl, extracted });
  } catch (err) {
    console.error("Upload/OCR error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
