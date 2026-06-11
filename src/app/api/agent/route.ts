import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Fetch all relevant restaurant data to build the RAG context
async function buildContext(): Promise<string> {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [revenues, invoices, expenses] = await Promise.all([
    // CA des 60 derniers jours
    prisma.dailyRevenue.findMany({
      where: { date: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: "desc" },
    }),
    // Factures fournisseurs avec articles
    prisma.invoice.findMany({
      orderBy: { date: "desc" },
      take: 30,
      include: { items: true },
    }),
    // Charges des 2 derniers mois
    prisma.expense.findMany({
      where: { date: { gte: firstDayLastMonth } },
      orderBy: { date: "desc" },
    }),
  ]);

  // CA mensuel agrégé
  const caByMonth: Record<string, number> = {};
  for (const r of revenues) {
    const key = r.date.toISOString().slice(0, 7); // "2026-05"
    caByMonth[key] = (caByMonth[key] ?? 0) + r.total;
  }

  // Charges par catégorie ce mois
  const expensesThisMonth = expenses.filter(
    (e) => new Date(e.date) >= firstDayOfMonth
  );
  const expensesByCategory: Record<string, number> = {};
  for (const e of expensesThisMonth) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + e.amount;
  }

  // Coût fournisseurs ce mois
  const invoicesThisMonth = invoices.filter(
    (i) => new Date(i.date) >= firstDayOfMonth
  );

  const lines: string[] = [
    `Date du jour : ${now.toLocaleDateString("fr-FR")}`,
    "",
    "=== CHIFFRE D'AFFAIRES ===",
    ...Object.entries(caByMonth).map(
      ([month, total]) => `${month} : ${total.toFixed(2)} €`
    ),
    "",
    "=== FACTURES FOURNISSEURS (30 dernières) ===",
    ...invoices.map(
      (inv) =>
        `- ${inv.supplierName} | ${new Date(inv.date).toLocaleDateString("fr-FR")} | HT: ${inv.amountHT?.toFixed(2) ?? "?"} € | TTC: ${(inv.amountTTC ?? inv.totalAmount).toFixed(2)} €` +
        (inv.items.length
          ? "\n  Articles: " +
            inv.items.map((it) => `${it.description} x${it.quantity ?? 1} = ${it.totalPrice.toFixed(2)} €`).join(", ")
          : "")
    ),
    "",
    `=== CHARGES CE MOIS (${now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}) ===`,
    ...Object.entries(expensesByCategory).map(
      ([cat, total]) => `${cat} : ${total.toFixed(2)} €`
    ),
    expensesThisMonth.length === 0 ? "Aucune charge saisie ce mois." : "",
    "",
    "=== RÉSUMÉ CE MOIS ===",
    `CA total : ${(caByMonth[now.toISOString().slice(0, 7)] ?? 0).toFixed(2)} €`,
    `Coût fournisseurs : ${invoicesThisMonth.reduce((s, i) => s + (i.amountTTC ?? i.totalAmount), 0).toFixed(2)} €`,
    `Total charges : ${Object.values(expensesByCategory).reduce((s, v) => s + v, 0).toFixed(2)} €`,
  ];

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Clé API Groq manquante dans .env.local" },
        { status: 500 }
      );
    }

    const context = await buildContext();

    const systemPrompt = `Tu es l'assistant intelligent de RestoLens, une application de gestion pour un restaurant.
Tu as accès aux données réelles du restaurant ci-dessous. Réponds en français, de façon concise et utile.
Si une information n'est pas dans les données, dis-le clairement.

--- DONNÉES DU RESTAURANT ---
${context}
--- FIN DES DONNÉES ---`;

    // Streaming response avec Groq
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
