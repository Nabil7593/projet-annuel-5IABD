import { PeriodPicker } from "@/components/period-picker";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { RevenueOverviewChart } from "./chart";
import { CustomRangePicker } from "./custom-range-picker";

type PropsType = {
  className?: string;
  timeFrame?: string;
  dateFrom?: string;
  dateTo?: string;
};

type DataPoint = {
  date: string;
  total: number;
  cash: number;
  card: number;
  ticketResto: number;
  uber: number;
};

async function fetchData(
  timeFrame: string,
  dateFrom?: string,
  dateTo?: string
): Promise<DataPoint[]> {
  if (timeFrame === "personnalise" && dateFrom && dateTo) {
    const revenues = await prisma.dailyRevenue.findMany({
      where: { date: { gte: new Date(dateFrom), lte: new Date(dateTo) } },
      orderBy: { date: "asc" },
    });
    return revenues.map((r) => ({
      date: new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      total: r.total,
      cash: r.cash,
      card: r.card,
      ticketResto: r.ticketResto,
      uber: r.uber,
    }));
  }

  if (timeFrame === "annuel") {
    const rows = await prisma.$queryRaw<
      { year: Date; total: number; cash: number; card: number; ticket_resto: number; uber: number }[]
    >`
      SELECT
        DATE_TRUNC('year', date)  AS year,
        SUM(total)::float         AS total,
        SUM(cash)::float          AS cash,
        SUM(card)::float          AS card,
        SUM(ticket_resto)::float  AS ticket_resto,
        SUM(uber)::float          AS uber
      FROM daily_revenues
      GROUP BY DATE_TRUNC('year', date)
      ORDER BY year ASC
    `;
    return rows.map((r) => ({
      date: new Date(r.year).getFullYear().toString(),
      total: r.total,
      cash: r.cash,
      card: r.card,
      ticketResto: r.ticket_resto,
      uber: r.uber,
    }));
  }

  if (timeFrame === "mensuel") {
    const rows = await prisma.$queryRaw<
      { month: Date; total: number; cash: number; card: number; ticket_resto: number; uber: number }[]
    >`
      SELECT
        DATE_TRUNC('month', date) AS month,
        SUM(total)::float         AS total,
        SUM(cash)::float          AS cash,
        SUM(card)::float          AS card,
        SUM(ticket_resto)::float  AS ticket_resto,
        SUM(uber)::float          AS uber
      FROM daily_revenues
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

  // journalier : 30 dernières saisies
  const revenues = await prisma.dailyRevenue.findMany({
    orderBy: { date: "desc" },
    take: 30,
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

async function fetchCurrentMonthTotal(): Promise<{ total: number; label: string }> {
  const last = await prisma.dailyRevenue.findFirst({ orderBy: { date: "desc" } });
  if (!last) return { total: 0, label: "CA total" };

  const ref = new Date(last.date);
  const firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);

  const result = await prisma.dailyRevenue.aggregate({
    _sum: { total: true },
    where: { date: { gte: firstDay, lte: lastDay } },
  });

  const monthLabel = ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { total: result._sum.total ?? 0, label: `CA total ${monthLabel}` };
}

const PERIOD_LABELS: Record<string, string> = {
  journalier: "30 derniers jours",
  mensuel: "par mois",
  annuel: "par année",
  personnalise: "période personnalisée",
};

const AVG_LABELS: Record<string, string> = {
  journalier: "Moy. / jour",
  mensuel: "Moy. / mois",
  annuel: "Moy. / an",
  personnalise: "Moy. / jour",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function RevenueOverview({
  className,
  timeFrame = "journalier",
  dateFrom,
  dateTo,
}: PropsType) {
  const isCustom = timeFrame === "personnalise";
  const hasRange = isCustom && dateFrom && dateTo;

  const [data, monthStat] = await Promise.all([
    hasRange ? fetchData(timeFrame, dateFrom, dateTo) : fetchData(timeFrame),
    fetchCurrentMonthTotal(),
  ]);

  const totalCA = data.reduce((s, r) => s + r.total, 0);
  const avgCA = data.length > 0 ? totalCA / data.length : 0;

  // Pour la période personnalisée, les stats reflètent la plage sélectionnée
  const col1Label = isCustom && hasRange
    ? `CA total : ${formatDate(dateFrom!)} → ${formatDate(dateTo!)}`
    : monthStat.label;
  const col1Value = isCustom && hasRange ? totalCA : monthStat.total;

  const subtitleLabel = isCustom && hasRange
    ? `Du ${formatDate(dateFrom!)} au ${formatDate(dateTo!)}`
    : (PERIOD_LABELS[timeFrame] ?? PERIOD_LABELS["journalier"]);

  return (
    <div
      className={cn(
        "rounded-[10px] bg-white px-7.5 pb-6 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
            CA Journalier
          </h2>
          <p className="mt-0.5 text-sm font-medium text-dark-6 dark:text-dark-4">
            {subtitleLabel}
          </p>
          {isCustom && (
            <CustomRangePicker dateFrom={dateFrom} dateTo={dateTo} />
          )}
        </div>

        <PeriodPicker
          defaultValue={timeFrame}
          sectionKey="revenue_overview"
          items={["journalier", "mensuel", "annuel", "personnalise"]}
        />
      </div>

      {(!isCustom || hasRange) && data.length > 0 ? (
        <RevenueOverviewChart data={data} timeFrame={timeFrame} />
      ) : isCustom && !hasRange ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-dark-6 dark:text-dark-4">
          Sélectionnez une période ci-dessus pour afficher les données.
        </div>
      ) : (
        <div className="flex h-[320px] items-center justify-center text-sm text-dark-6 dark:text-dark-4">
          Aucune donnée pour cette période.
        </div>
      )}

      <dl className="mt-2 grid grid-cols-2 divide-x divide-stroke text-center dark:divide-dark-3">
        <div className="flex flex-col-reverse gap-1 px-4 py-2">
          <dd className="text-sm font-medium text-dark-6 dark:text-dark-4 capitalize">
            {col1Label}
          </dd>
          <dt className="text-xl font-bold text-dark dark:text-white">
            {col1Value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </dt>
        </div>
        <div className="flex flex-col-reverse gap-1 px-4 py-2">
          <dd className="text-sm font-medium text-dark-6 dark:text-dark-4">
            {AVG_LABELS[timeFrame] ?? "Moy. / jour"}
          </dd>
          <dt className="text-xl font-bold text-dark dark:text-white">
            {avgCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </dt>
        </div>
      </dl>
    </div>
  );
}
