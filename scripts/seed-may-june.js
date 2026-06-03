// Seed realistic daily revenue data from May 2 to June 1, 2026
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// French public holidays in the period
const HOLIDAYS = new Set([
  "2026-05-08", // Victoire 1945
  "2026-05-14", // Ascension
  "2026-05-25", // Lundi de Pentecôte
]);

// Base revenue by day of week (0=Sunday)
const BASE_BY_DOW = [1150, 980, 1020, 1050, 1080, 1380, 1450];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function generateRevenue(dateStr) {
  const date = new Date(dateStr);
  const dow = date.getDay();
  const isHoliday = HOLIDAYS.has(dateStr);

  let base = isHoliday ? rand(1350, 1700) : BASE_BY_DOW[dow];
  // Add day-to-day noise ±10%
  base *= rand(0.90, 1.10);

  const total = Math.round(base * 100) / 100;

  // Realistic payment split
  const cardRatio = rand(0.52, 0.64);
  const cashRatio = rand(0.17, 0.25);
  const trRatio = rand(0.07, 0.13);
  const uberRatio = 1 - cardRatio - cashRatio - trRatio;

  const card = Math.round(total * cardRatio * 100) / 100;
  const cash = Math.round(total * cashRatio * 100) / 100;
  const ticketResto = Math.round(total * trRatio * 100) / 100;
  const uber = Math.round((total - card - cash - ticketResto) * 100) / 100;

  return { total, card, cash, ticketResto, uber };
}

function dateRange(start, end) {
  const dates = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

async function seed() {
  const dates = dateRange("2026-05-02", "2026-06-01");
  console.log(`Generating ${dates.length} days of data...`);

  for (const dateStr of dates) {
    const { total, card, cash, ticketResto, uber } = generateRevenue(dateStr);

    await pool.query(
      `INSERT INTO daily_revenues (id, date, cash, card, ticket_resto, uber, total, created_at, updated_at)
       VALUES (gen_random_uuid(), $1::date, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (date) DO UPDATE SET
         cash = EXCLUDED.cash, card = EXCLUDED.card,
         ticket_resto = EXCLUDED.ticket_resto, uber = EXCLUDED.uber,
         total = EXCLUDED.total, updated_at = NOW()`,
      [dateStr, cash, card, ticketResto, uber, total]
    );

    const dow = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][new Date(dateStr).getDay()];
    const flag = HOLIDAYS.has(dateStr) ? " 🎉" : "";
    console.log(`  ${dow} ${dateStr}${flag} → total: ${total.toFixed(2)} € (CB: ${card.toFixed(0)} | Cash: ${cash.toFixed(0)} | TR: ${ticketResto.toFixed(0)} | Uber: ${uber.toFixed(0)})`);
  }

  const res = await pool.query("SELECT COUNT(*) FROM daily_revenues");
  console.log(`\nTotal rows in DB: ${res.rows[0].count}`);
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
