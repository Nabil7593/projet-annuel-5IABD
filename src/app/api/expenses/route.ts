import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, description, amount, category } = body;

    if (!date || !description || !amount || !category) {
      return NextResponse.json(
        { error: "Tous les champs sont obligatoires" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        date: new Date(date),
        description,
        amount: parseFloat(amount),
        category,
      },
    });

    return NextResponse.json(
      { message: "Charge enregistrée avec succès", data: expense },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving expense:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: "desc" },
      take: 20,
    });

    return NextResponse.json({ data: expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}
