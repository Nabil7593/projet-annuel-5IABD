import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { MonthlyResultChart } from "./chart";

type PropsType = {
  timeFrame?: string;
  className?: string;
};

type MonthPoint = { x: string; ca: number; resultat: number; costs: number };

async function fetchMonthlyData(): Promise<MonthPoint[]> {
  type Row = { month: Date; ca: number; inv_cost: number; charges: number };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      DATE_TRUNC('month', d.date)::date AS month,
      COALESCE(SUM(d.total), 0)::float  AS ca,
      COALESCE((
        SELECT SUM(COALESCE(amount_ttc, total_amount))
        FROM invoices i
        WHERE DATE_TRUNC('month', i.date) = DATE_TRUNC('month', d.date)
      ), 0)::float AS inv_cost,
      COALESCE((
        SELECT SUM(amount)
        FROM expenses e
        WHERE DATE_TRUNC('month', e.date) = DATE_TRUNC('month', d.date)
      ), 0)::float AS charges
    FROM daily_revenues d
    GROUP BY DATE_TRUNC('month', d.date)
    ORDER BY month ASC
  `.catch(() => [] as Row[]);

  return rows.map((r) => {
    const ca       = Math.round(r.ca);
    const resultat = Math.round(r.ca - r.inv_cost - r.charges);
    return {
      x:        new Date(r.month).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      ca,
      resultat,
      costs:    Math.max(ca - resultat, 0),
    };
  });
}

export async function WeeksProfit({ className }: PropsType) {
  const data = await fetchMonthlyData();

  return (
    <div
      className={cn(
        "rounded-[10px] bg-white px-7.5 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className,
      )}
    >
      <div className="mb-1">
        <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
          CA vs Résultat net
        </h2>
        <p className="mt-0.5 text-sm font-medium text-dark-6 dark:text-dark-4">
          Mensuel — tous les mois saisis
        </p>
      </div>

      <MonthlyResultChart data={data} />
    </div>
  );
}
