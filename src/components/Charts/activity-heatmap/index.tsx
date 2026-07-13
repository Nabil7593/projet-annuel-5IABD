import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { HeatmapClient } from "./heatmap-client";
import { cn } from "@/lib/utils";

type MonthRow = { month: Date; total: number };
type DayRow  = { date: Date;  total: number };

const getMonthlyTotals = cache(async () =>
  prisma.$queryRaw<MonthRow[]>`
    SELECT DATE_TRUNC('month', date)::date AS month,
           SUM(total)::float               AS total
    FROM   daily_revenues
    GROUP  BY DATE_TRUNC('month', date)
    ORDER  BY month ASC
  `.catch(() => [] as MonthRow[])
);

const getLastCompleteMonth = cache(async (): Promise<string> => {
  const rows = await prisma.$queryRaw<{ month: Date }[]>`
    SELECT DATE_TRUNC('month', date)::date AS month
    FROM   daily_revenues
    WHERE  DATE_TRUNC('month', date) < DATE_TRUNC('month', CURRENT_DATE)
    ORDER  BY month DESC
    LIMIT  1
  `.catch(() => [] as { month: Date }[]);

  if (!rows[0]) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
  }
  return new Date(rows[0].month).toISOString().slice(0, 7);
});

const getDailyForMonth = cache(async (monthStr: string) => {
  const from = `${monthStr}-01`;
  return prisma.$queryRaw<DayRow[]>`
    SELECT date::date, total::float
    FROM   daily_revenues
    WHERE  DATE_TRUNC('month', date) = ${from}::date
    ORDER  BY date ASC
  `.catch(() => [] as DayRow[]);
});

type Props = {
  className?: string;
  selectedMonth?: string;
};

export async function ActivityHeatmap({ className, selectedMonth }: Props) {
  const defaultMonth = await getLastCompleteMonth();
  const month = selectedMonth ?? defaultMonth;

  const [monthlyRows, dailyRows] = await Promise.all([
    getMonthlyTotals(),
    getDailyForMonth(month),
  ]);

  const months = monthlyRows.map((r) => ({
    value: new Date(r.month).toISOString().slice(0, 7),
    label: new Date(r.month).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    total: r.total,
  }));

  const days = dailyRows.map((r) => ({
    date: new Date(r.date).toISOString().slice(0, 10),
    total: r.total,
  }));

  return (
    <HeatmapClient
      selectedMonth={month}
      months={months}
      days={days}
      className={cn("col-span-12", className)}
    />
  );
}
