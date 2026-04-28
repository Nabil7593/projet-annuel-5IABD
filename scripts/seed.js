const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const fs = require('fs')
const { parse } = require('csv-parse/sync')
require('dotenv/config')

// Même config que src/lib/prisma.ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const file = fs.readFileSync('scripts/daily_revenues_2024_real.csv', 'utf-8')
  // Ligne du parse — ajoute delimiter
  const rows = parse(file, { columns: true, skip_empty_lines: true, delimiter: ';' })

  // Ligne du map — corrige le format de date DD/MM/YYYY
  const data = rows.map((row) => {
    const [day, month, year] = row.date.split('/')
    return {
      date:        new Date(`${year}-${month}-${day}`),
      cash:        parseFloat(row.cash),
      card:        parseFloat(row.card),
      ticketResto: parseFloat(row.ticket_resto),
      uber:        parseFloat(row.uber),
      total:       parseFloat(row.total),
    }
  })

  await prisma.dailyRevenue.deleteMany()
  console.log('🗑️  Table vidée')

  await prisma.dailyRevenue.createMany({ data })
  console.log(`✅ ${data.length} lignes insérées !`)
}

main()
  .catch((e) => { console.error('❌ Erreur :', e); process.exit(1) })
  .finally(async () => { 
    await prisma.$disconnect()
    await pool.end()
  })