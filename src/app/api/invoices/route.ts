import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { date: "desc" },
      include: { items: true },
    });
    return NextResponse.json(invoices);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supplierName, invoiceNumber, date, totalAmount, amountHT, amountTTC, tva, pdfUrl, items = [] } = body;

    const invoice = await prisma.invoice.create({
      data: {
        supplierName,
        invoiceNumber: invoiceNumber || null,
        date:          new Date(date),
        totalAmount:   parseFloat(totalAmount) || 0,
        amountHT:      amountHT  ? parseFloat(amountHT)  : null,
        amountTTC:     amountTTC ? parseFloat(amountTTC) : null,
        tva:           tva       ? parseFloat(tva)       : null,
        pdfUrl:        pdfUrl    || null,
        items: {
          createMany: {
            data: items.map((item: any) => ({
              description: item.description,
              quantity:    item.quantity   ?? null,
              tvaRate:     item.tvaRate    ?? null,
              unitPrice:   item.unitPrice  ?? null,
              totalPrice:  item.totalPrice ?? 0,
            })),
          },
        },
      },
      include: { items: true },
    });

    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
