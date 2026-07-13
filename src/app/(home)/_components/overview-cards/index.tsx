import { prisma } from "@/lib/prisma";
import { KpiPeriodPicker } from "./kpi-period-picker";
import { MiniSparkline, RatioBar } from "./mini-sparkline";
import { ArrowDownIcon, ArrowUpIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";

type Props = { period?: string; kpiFrom?: string; kpiTo?: string };

// ── period helpers ──────────────────────────────────────────────
function getPeriodDates(period = "prev-month", kpiFrom?: string, kpiTo?: string) {
  const now = new Date();
  switch (period) {
    case "cur-month":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to:   now,
        label: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      };
    case "custom": {
      if (kpiFrom && kpiTo) {
        const from = new Date(kpiFrom);
        const to   = new Date(kpiTo);
        const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
        return { from, to, label: `${fmt(from)} → ${fmt(to)}` };
      }
      // fallback to prev-month if no dates provided
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to   = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to, label: from.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) };
    }
    default: {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to   = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to, label: from.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) };
    }
  }
}

function getPrevPeriodDates(period = "prev-month", kpiFrom?: string, kpiTo?: string) {
  const now = new Date();
  switch (period) {
    case "cur-month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to:   new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
      };
    case "custom": {
      if (kpiFrom && kpiTo) {
        const from = new Date(kpiFrom);
        const to   = new Date(kpiTo);
        const diffMs = to.getTime() - from.getTime();
        return {
          from: new Date(from.getTime() - diffMs - 24 * 60 * 60 * 1000),
          to:   new Date(from.getTime() - 24 * 60 * 60 * 1000),
        };
      }
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: new Date(now.getFullYear(), now.getMonth() - 1, 0) };
    }
    default:
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        to:   new Date(now.getFullYear(), now.getMonth() - 1, 0),
      };
  }
}

// ── data fetch ──────────────────────────────────────────────────
async function fetchKpiData(period: string, kpiFrom?: string, kpiTo?: string) {
  const { from, to, label } = getPeriodDates(period, kpiFrom, kpiTo);
  const { from: pFrom, to: pTo } = getPrevPeriodDates(period, kpiFrom, kpiTo);

  const fromStr  = from.toISOString().slice(0, 10);
  const toStr    = to.toISOString().slice(0, 10);
  const pFromStr = pFrom.toISOString().slice(0, 10);
  const pToStr   = pTo.toISOString().slice(0, 10);

  // 2 requêtes au lieu de 7 — une par période
  type KpiRow = { ca: number; inv_cost: number; charges: number };
  type DailyRow = { total: number };

  const [curr, prev, dailyRows] = await Promise.all([
    prisma.$queryRaw<[KpiRow]>`
      SELECT
        COALESCE((SELECT SUM(total)  FROM daily_revenues WHERE date >= ${fromStr}::date AND date <= ${toStr}::date), 0)::float AS ca,
        COALESCE((SELECT SUM(COALESCE(amount_ttc, total_amount)) FROM invoices WHERE date >= ${fromStr}::date AND date <= ${toStr}::date), 0)::float AS inv_cost,
        COALESCE((SELECT SUM(amount) FROM expenses WHERE date >= ${fromStr}::date AND date <= ${toStr}::date), 0)::float AS charges`,
    prisma.$queryRaw<[KpiRow]>`
      SELECT
        COALESCE((SELECT SUM(total)  FROM daily_revenues WHERE date >= ${pFromStr}::date AND date <= ${pToStr}::date), 0)::float AS ca,
        COALESCE((SELECT SUM(COALESCE(amount_ttc, total_amount)) FROM invoices WHERE date >= ${pFromStr}::date AND date <= ${pToStr}::date), 0)::float AS inv_cost,
        COALESCE((SELECT SUM(amount) FROM expenses WHERE date >= ${pFromStr}::date AND date <= ${pToStr}::date), 0)::float AS charges`,
    prisma.$queryRaw<DailyRow[]>`
      SELECT total::float FROM daily_revenues
      WHERE date >= ${fromStr}::date AND date <= ${toStr}::date
      ORDER BY date ASC`,
  ]);

  const ca          = curr[0]?.ca ?? 0;
  const caPrev      = prev[0]?.ca ?? 0;
  const invCost     = curr[0]?.inv_cost ?? 0;
  const invCostPrev = prev[0]?.inv_cost ?? 0;
  const charges     = curr[0]?.charges ?? 0;
  const chargesPrev = prev[0]?.charges ?? 0;

  const resultat     = ca - invCost - charges;
  const resultatPrev = caPrev - invCostPrev - chargesPrev;

  const trend = (prev: number, curr: number) =>
    prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : null;

  return {
    label,
    ca,
    resultat,
    resultatTrend: trend(resultatPrev, resultat),
    foodCostPct:   ca > 0 ? (invCost / ca) * 100 : 0,
    chargesPct:    ca > 0 ? (charges / ca) * 100 : 0,
    sparkData:     dailyRows.map((r) => Math.round(r.total)),
    invCost,
    charges,
  };
}

// ── component ───────────────────────────────────────────────────
const EMPTY = { label: "—", ca: 0, resultat: 0, resultatTrend: null, foodCostPct: 0, chargesPct: 0, sparkData: [], invCost: 0, charges: 0 };

export async function OverviewCardsGroup({ period = "prev-month", kpiFrom, kpiTo }: Props) {
  const data = await fetchKpiData(period, kpiFrom, kpiTo).catch(() => EMPTY);

  const isPos = (data.resultatTrend ?? 0) >= 0;

  return (
    <div>
      {/* header row */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-dark-6 dark:text-dark-4 uppercase tracking-wider">
          Indicateurs clés — {data.label}
        </h2>
        <KpiPeriodPicker value={period} kpiFrom={kpiFrom} kpiTo={kpiTo} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 sm:gap-6 2xl:gap-7.5">

        {/* Card 1 — Résultat net */}
        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.343-4 3s1.79 3 4 3 4 1.343 4 3-1.79 3-4 3m0-18v2m0 16v2M8 12H4m16 0h-4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-dark-6 dark:text-dark-4">Résultat net estimé</span>
          </div>

          <p className={cn("mt-4 text-2xl font-bold", data.resultat >= 0 ? "text-dark dark:text-white" : "text-red-500")}>
            {data.resultat.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </p>
          <p className="mt-0.5 text-xs text-dark-6 dark:text-dark-4">
            CA {data.ca.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € − fournisseurs {data.invCost.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € − charges {data.charges.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </p>

          {data.resultatTrend !== null && (
            <p className={cn("mt-2 flex items-center gap-1 text-sm font-medium", isPos ? "text-green" : "text-red")}>
              {isPos ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
              {Math.abs(data.resultatTrend).toFixed(1)}% vs période préc.
            </p>
          )}

          <div className="mt-3">
            <MiniSparkline data={data.sparkData} color="#22c55e" />
          </div>
        </div>

        {/* Card 2 — Food cost */}
        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m13-9l2 9M9 21h6" />
              </svg>
            </div>
            <span className="text-sm font-medium text-dark-6 dark:text-dark-4">Coût matières (food cost)</span>
          </div>

          <p className={cn("mt-4 text-2xl font-bold", data.foodCostPct > 30 ? "text-red-500" : "text-dark dark:text-white")}>
            {data.foodCostPct.toFixed(1)} %
          </p>
          <p className="mt-0.5 text-xs text-dark-6 dark:text-dark-4">
            {data.invCost.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € de fournisseurs sur {data.ca.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € de CA
          </p>

          <RatioBar value={data.foodCostPct} threshold={30} thresholdLabel="Idéal < 30%" />
        </div>

        {/* Card 3 — Taux charges fixes */}
        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-dark-6 dark:text-dark-4">Taux de charges fixes</span>
          </div>

          <p className={cn("mt-4 text-2xl font-bold", data.chargesPct > 40 ? "text-red-500" : "text-dark dark:text-white")}>
            {data.chargesPct.toFixed(1)} %
          </p>
          <p className="mt-0.5 text-xs text-dark-6 dark:text-dark-4">
            {data.charges.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € de charges sur {data.ca.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € de CA
          </p>

          <RatioBar value={data.chargesPct} threshold={40} thresholdLabel="Idéal < 40%" />
        </div>
      </div>
    </div>
  );
}
