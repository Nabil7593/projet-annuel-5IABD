import { PeriodPicker } from "@/components/period-picker";
import { prisma } from "@/lib/prisma";
import { getAllDailyRevenues, getCurrentMonthTotal } from "@/lib/db-cache";
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
    const rows = await prisma.$queryRaw<
      { date: Date; total: number; cash: number; card: number; ticket_resto: number; uber: number }[]
    >`
      SELECT date, total::float, cash::float, card::float, ticket_resto::float, uber::float
      FROM daily_revenues
      WHERE date >= ${dateFrom}::date AND date <= ${dateTo}::date
      ORDER BY date ASC
    `.catch(() => []);
    return rows.map((r) => ({
      date: new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      total: r.total,
      cash: r.cash,
      card: r.card,
      ticketResto: r.ticket_resto,
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
    `.catch(() => []);
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
    `.catch(() => []);
    return rows.map((r) => ({
      date: new Date(r.month).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      total: r.total,
      cash: r.cash,
      card: r.card,
      ticketResto: r.ticket_resto,
      uber: r.uber,
    }));
  }

  // journalier: utilise le cache partagé, prend les 30 derniers en mémoire
  const all = await getAllDailyRevenues();
  const last30 = all.slice(-30);
  return last30.map((r) => ({
    date: new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    total: r.total,
    cash: r.cash,
    card: r.card,
    ticketResto: r.ticket_resto,
    uber: r.uber,
  }));
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
    fetchData(timeFrame, dateFrom, dateTo),
    getCurrentMonthTotal(),
  ]);

  const totalCA = data.reduce((s, r) => s + r.total, 0);
  const avgCA = data.length > 0 ? totalCA / data.length : 0;

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
