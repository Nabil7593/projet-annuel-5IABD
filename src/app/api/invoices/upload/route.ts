import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  TextractClient,
  AnalyzeDocumentCommand,
  Block,
} from "@aws-sdk/client-textract";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-3" });
// Textract Queries is supported in eu-west-1 (closest to Paris)
const textract = new TextractClient({ region: "eu-west-1" });

// Natural-language questions sent to Textract — the model answers them directly
const INVOICE_QUERIES = [
  { Text: "What is the supplier or company name?", Alias: "SUPPLIER" },
  { Text: "What is the invoice or order number?",  Alias: "INVOICE_NUMBER" },
  { Text: "What is the invoice date?",             Alias: "DATE" },
  { Text: "What is the total HT amount?",          Alias: "TOTAL_HT" },
  { Text: "What is the total TTC amount?",         Alias: "TOTAL_TTC" },
  { Text: "What is the TVA amount?",               Alias: "TVA" },
];

// Walk QUERY blocks to find their ANSWER blocks and build an alias → text map
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

function cleanAmount(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^\d,.-]/g, "").replace(",", "."));
  return isNaN(n) || n === 0 ? null : n;
}

// Normalise dates returned by Textract to YYYY-MM-DD
function parseDate(s: string | undefined): string {
  if (!s) return "";

  const frMonths: Record<string, string> = {
    janvier: "01", fevrier: "02", mars: "03", avril: "04",
    mai: "05", juin: "06", juillet: "07", aout: "08",
    septembre: "09", octobre: "10", novembre: "11", decembre: "12",
  };
  const norm = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // "samedi 30 mai 2026" or "30 mai 2026"
  const mText = s.match(
    /(?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+)?(\d{1,2})\s+(\S+)\s+(\d{4})/i
  );
  if (mText) {
    const month = frMonths[norm(mText[2])] ?? "01";
    return `${mText[3]}-${month}-${mText[1].padStart(2, "0")}`;
  }

  // "30/05/2026" or "30-05-2026" — 4-digit year required
  const mNum = s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (mNum) {
    return `${mNum[3]}-${mNum[2].padStart(2, "0")}-${mNum[1].padStart(2, "0")}`;
  }

  return s;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Fichier PDF requis" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `factures/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

    // 1. Store the PDF in S3 for archiving
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_INVOICES_BUCKET ?? "restolens-factures-fournisseurs",
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );

    const pdfUrl = `https://${process.env.AWS_S3_INVOICES_BUCKET ?? "restolens-factures-fournisseurs"}.s3.${
      process.env.AWS_REGION ?? "eu-west-3"
    }.amazonaws.com/${key}`;

    // 2. Send the PDF bytes to Textract with QUERIES mode
    //    Textract answers each question using its document-understanding model —
    //    no regex parsing required on our side.
    const textractResult = await textract.send(
      new AnalyzeDocumentCommand({
        Document: { Bytes: buffer },
        FeatureTypes: ["QUERIES"],
        QueriesConfig: { Queries: INVOICE_QUERIES },
      })
    );

    const blocks = textractResult.Blocks ?? [];

    const rawText = blocks
      .filter((b) => b.BlockType === "LINE")
      .map((b) => b.Text ?? "")
      .join("\n");

    // 3. Map Textract answers to our data model
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
      rawText,
    };

    return NextResponse.json({ pdfUrl, extracted });
  } catch (err) {
    console.error("Upload/OCR error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
