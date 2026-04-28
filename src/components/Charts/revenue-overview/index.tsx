import { PeriodPicker } from "@/components/period-picker";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { RevenueOverviewChart } from "./chart";

type PropsType = {
  className?: string;
  timeFrame?: string;
};

type DataPoint = {
  date: string;
  total: number;
  cash: number;
  card: number;
  ticketResto: number;
  uber: number;
};

async function fetchData(timeFrame: string): Promise<DataPoint[]> {
  if (timeFrame === "annee") {
    // Agrégation mensuelle sur les 12 derniers mois
    const rows = await prisma.$queryRaw<
      { month: Date; total: number; cash: number; card: number; ticket_resto: number; uber: number }[]
    >`
      SELECT
        DATE_TRUNC('month', date) AS month,
        SUM(total)::float       AS total,
        SUM(cash)::float        AS cash,
        SUM(card)::float        AS card,
        SUM(ticket_resto)::float AS ticket_resto,
        SUM(uber)::float        AS uber
      FROM daily_revenues
      WHERE date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month ASC
    `;

    return rows.map((r) => ({
      date: new Date(r.month).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      total: r.total,
      cash: r.cash,
      card: r.card,
      ticketResto: r.ticket_resto,
      uber: r.uber,
    }));
  }

  const take = timeFrame === "semaine" ? 7 : 30;

  const revenues = await prisma.dailyRevenue.findMany({
    orderBy: { date: "desc" },
    take,
  });

  revenues.reverse();

  return revenues.map((r) => ({
    date: new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    total: r.total,
    cash: r.cash,
    card: r.card,
    ticketResto: r.ticketResto,
    uber: r.uber,
  }));
}

const PERIOD_LABELS: Record<string, string> = {
  semaine: "7 derniers jours",
  mensuel: "30 derniers jours",
  annee: "12 derniers mois",
};

export async function RevenueOverview({ className, timeFrame = "mensuel" }: PropsType) {
  const data = await fetchData(timeFrame);

  const totalCA = data.reduce((sum, r) => sum + r.total, 0);
  const avgCA = data.length > 0 ? totalCA / data.length : 0;
  const avgLabel = timeFrame === "annee" ? "Moy. / mois" : "Moy. / jour";

  return (
    <div
      className={cn(
        "rounded-[10px] bg-white px-7.5 pb-6 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
            CA Journalier
          </h2>
          <p className="mt-0.5 text-sm font-medium text-dark-6 dark:text-dark-4">
            {PERIOD_LABELS[timeFrame] ?? PERIOD_LABELS["mensuel"]}
          </p>
        </div>

        <PeriodPicker
          defaultValue={timeFrame}
          sectionKey="revenue_overview"
          items={["semaine", "mensuel", "annee"]}
        />
      </div>

      <RevenueOverviewChart data={data} timeFrame={timeFrame} />

      <dl className="mt-2 grid grid-cols-3 divide-x divide-stroke text-center dark:divide-dark-3">
        <div className="flex flex-col-reverse gap-1 px-4 py-2">
          <dd className="text-sm font-medium text-dark-6 dark:text-dark-4">CA Total</dd>
          <dt className="text-xl font-bold text-dark dark:text-white">
            {totalCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </dt>
        </div>
        <div className="flex flex-col-reverse gap-1 px-4 py-2">
          <dd className="text-sm font-medium text-dark-6 dark:text-dark-4">{avgLabel}</dd>
          <dt className="text-xl font-bold text-dark dark:text-white">
            {avgCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </dt>
        </div>
        <div className="flex flex-col-reverse gap-1 px-4 py-2">
          <dd className="text-sm font-medium text-dark-6 dark:text-dark-4">
            {timeFrame === "annee" ? "Mois saisis" : "Jours saisis"}
          </dd>
          <dt className="text-xl font-bold text-dark dark:text-white">
            {data.length}
          </dt>
        </div>
      </dl>
    </div>
  );
}
