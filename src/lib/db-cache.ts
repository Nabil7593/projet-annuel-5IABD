import { cache } from "react";
import { prisma } from "./prisma";

// React.cache() deduplicates identical calls within a single render pass.
// Multiple server components calling these functions will only hit the DB once.

export const getAllDailyRevenues = cache(async () => {
  return prisma.$queryRaw<{ date: Date; total: number; cash: number; card: number; ticket_resto: number; uber: number }[]>`
    SELECT date, total::float, cash::float, card::float, ticket_resto::float, uber::float
    FROM daily_revenues
    ORDER BY date ASC
  `.catch(() => []);
});

export const getCurrentMonthTotal = cache(async () => {
  const rows = await prisma.$queryRaw<{ total: number; month: Date }[]>`
    SELECT
      COALESCE(SUM(total), 0)::float AS total,
      DATE_TRUNC('month', MAX(date)) AS month
    FROM daily_revenues
    WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', (SELECT MAX(date) FROM daily_revenues))
  `.catch(() => []);
  if (!rows[0]) return { total: 0, label: "CA total" };
  const monthLabel = new Date(rows[0].month).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { total: rows[0].total, label: `CA total ${monthLabel}` };
});
