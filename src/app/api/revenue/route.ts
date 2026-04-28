import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, cash, card, ticketResto, uber, total } = body;

    // Validate required fields
    if (!date) {
      return NextResponse.json(
        { error: "La date est obligatoire" },
        { status: 400 }
      );
    }

    // Parse date to DateTime
    const dateObj = new Date(date);

    // Upsert: create or update if exists
    const revenue = await prisma.dailyRevenue.upsert({
      where: {
        date: dateObj,
      },
      update: {
        cash: parseFloat(cash) || 0,
        card: parseFloat(card) || 0,
        ticketResto: parseFloat(ticketResto) || 0,
        uber: parseFloat(uber) || 0,
        total: parseFloat(total) || 0,
      },
      create: {
        date: dateObj,
        cash: parseFloat(cash) || 0,
        card: parseFloat(card) || 0,
        ticketResto: parseFloat(ticketResto) || 0,
        uber: parseFloat(uber) || 0,
        total: parseFloat(total) || 0,
      },
    });

    console.log("Revenue data saved to database:", revenue);

    return NextResponse.json(
      {
        message: "Chiffre d'affaires enregistré avec succès",
        data: revenue,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving revenue:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement des données" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (dateParam) {
      // Get entry for specific date
      const dateObj = new Date(dateParam);
      const entry = await prisma.dailyRevenue.findUnique({
        where: {
          date: dateObj,
        },
      });
      return NextResponse.json({ data: entry || null });
    }

    // Get last 35 entries, sorted by date (most recent first)
    const revenues = await prisma.dailyRevenue.findMany({
      orderBy: {
        date: "desc",
      },
      take: 350,
    });

    return NextResponse.json({ data: revenues });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}
