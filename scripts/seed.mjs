// ══════════════════════════════════════════════════════════════
// RestoLens — Seed Script
// Adapté au schéma existant : cash, card, ticketResto, uber, total
// Exécution : node scripts/seed.mjs
// ══════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── 1. Charger .env ───────────────────────────────────────────
const envPath = resolve(__dirname, '../.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let val = trimmed.slice(eqIndex + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
  console.log('✅ .env chargé')
} catch (e) {
  console.error('❌ Impossible de charger .env :', e.message)
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL manquant')
  process.exit(1)
}
console.log('✅ DATABASE_URL trouvé')

// ── 2. Prisma avec adapter pg ─────────────────────────────────
import pg from 'pg'
const { PrismaPg } = await import('@prisma/adapter-pg')
const { PrismaClient } = await import('@prisma/client')

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ── 3. Charger les données CSV ────────────────────────────────
const revenuesRaw = JSON.parse(
  readFileSync(resolve(__dirname, 'revenues_data.json'), 'utf-8')
)

// Mapper vers le schéma existant :
// cb → card, caTotal → total, ticketResto → ticketResto
const dailyRevenues = revenuesRaw.map(r => ({
  date: new Date(r.date + 'T00:00:00.000Z'),
  cash:        r.cash        ?? 0,
  card:        r.cb          ?? 0,   // cb → card
  ticketResto: r.ticketResto ?? 0,
  uber:        r.uber        ?? 0,
  total:       r.caTotal     ?? 0,   // caTotal → total
}))

// ── 4. Charges (schéma existant : date, category, description, amount) ──
const expenses = [
  { date: new Date('2024-01-01'), category: 'OTHER',        description: 'Achats matieres et appros', amount: 43157.00, isRecurring: true },
  { date: new Date('2024-01-01'), category: 'OTHER',        description: 'Variation de stock',        amount: -1239.00, isRecurring: false },
  { date: new Date('2024-01-01'), category: 'RENT',         description: 'Loyers services honoraires',amount: 60857.00, isRecurring: true },
  { date: new Date('2024-01-01'), category: 'OTHER',        description: 'CVAE et taxes assimilees',  amount: 826.00,   isRecurring: true },
  { date: new Date('2024-01-01'), category: 'SALARIES',     description: 'Remunerations personnel',   amount: 31966.00, isRecurring: true },
  { date: new Date('2024-01-01'), category: 'URSSAF',       description: 'Charges sociales',          amount: 604.00,   isRecurring: true },
]

// ── 5. Fonction principale ────────────────────────────────────
async function main() {
  console.log('\n🌱 Démarrage du seed RestoLens...')

  // CA journalier
  console.log(`\n📅 Import de ${dailyRevenues.length} jours de CA...`)
  let inserted = 0
  for (const row of dailyRevenues) {
    await prisma.dailyRevenue.upsert({
      where:  { date: row.date },
      update: { cash: row.cash, card: row.card, ticketResto: row.ticketResto, uber: row.uber, total: row.total },
      create: row,
    })
    inserted++
    if (inserted % 50 === 0) console.log(`   ${inserted}/${dailyRevenues.length}...`)
  }
  console.log(`   ✅ ${inserted} jours importés`)

  // Charges
  console.log(`\n💰 Import de ${expenses.length} charges...`)
  for (const expense of expenses) {
    await prisma.expense.create({ data: expense })
  }
  console.log(`   ✅ ${expenses.length} charges importées`)

  // Résumé
  const countRev = await prisma.dailyRevenue.count()
  const countExp = await prisma.expense.count()

  console.log('\n══════════════════════════════════════')
  console.log('   SEED TERMINÉ — RÉSUMÉ RDS')
  console.log('══════════════════════════════════════')
  console.log(`   daily_revenues : ${countRev} lignes`)
  console.log(`   expenses       : ${countExp} lignes`)
  console.log('══════════════════════════════════════\n')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
    await prisma.$disconnect()
  })
