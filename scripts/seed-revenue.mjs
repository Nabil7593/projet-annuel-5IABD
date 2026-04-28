import pg from "pg";
import { randomUUID } from "crypto";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DIRECT_URL });

// Génère un nombre arrondi à 2 décimales
const round2 = (n) => Math.round(n * 100) / 100;

// Génère les 90 jours (d'hier en remontant)
const rows = [];
const today = new Date();
today.setHours(0, 0, 0, 0);

for (let i = 1; i <= 90; i++) {
  const date = new Date(today);
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().split("T")[0];

  // Total entre 800 et 1300 €
  const total = round2(800 + Math.random() * 500);

  // Cash : ~40% (variation ±4%)
  const cash = round2(total * (0.38 + Math.random() * 0.04));

  // CB : ~50% (variation ±4%)
  const card = round2(total * (0.48 + Math.random() * 0.04));

  // Reste (~10%) : uber + ticket resto
  const remaining = round2(total - cash - card);
  const uberShare = 0.4 + Math.random() * 0.3; // 40-70% du reste pour uber
  const uber = round2(remaining * uberShare);
  const ticketResto = round2(remaining - uber);

  rows.push({ id: randomUUID(), date: dateStr, cash, card, ticketResto, uber, total });
}

async function seed() {
  const client = await pool.connect();
  let inserted = 0;
  try {
    for (const row of rows) {
      const result = await client.query(
        `INSERT INTO daily_revenues (id, date, cash, card, ticket_resto, uber, total, created_at, updated_at)
         VALUES ($1, $2::date, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (date) DO NOTHING`,
        [row.id, row.date, row.cash, row.card, row.ticketResto, row.uber, row.total]
      );
      if (result.rowCount > 0) inserted++;
    }
    console.log(`✅ ${inserted} lignes insérées (${rows.length - inserted} ignorées car déjà existantes)`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("❌ Erreur :", err.message);
  process.exit(1);
});
