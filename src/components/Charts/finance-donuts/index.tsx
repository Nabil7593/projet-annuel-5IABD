import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { ExpensesChart, type DonutSlice, type EvolutionSeries } from "./expenses-chart";
import { SuppliersChart } from "./suppliers-chart";

// ── constants ────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITY: "Électricité",
  SALARIES:    "Salaires",
  URSSAF:      "URSSAF",
  SUBSCRIPTION:"Abonnements",
  RENT:        "Loyer",
  INSURANCE:   "Assurances",
  MAINTENANCE: "Maintenance",
  OTHER:       "Autres",
};

const CATEGORY_COLORS = [
  "#5750F1", "#22c55e", "#f59e0b", "#ef4444",
  "#f97316", "#06b6d4", "#8b5cf6", "#6b7280",
];

const SUPPLIER_COLORS = [
  "#5750F1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6",
];

// ── queries ──────────────────────────────────────────────────────────
type ExpRow = { month: Date; category: string; total: number };
type SupRow = { month: Date; supplier_name: string; total: number };

// Fetch last 12 months for evolution, but we'll filter the donut to last complete month
const getExpenseRows = cache(async () =>
  prisma.$queryRaw<ExpRow[]>`
    SELECT DATE_TRUNC('month', date)::date AS month,
           category::text,
           SUM(amount)::float              AS total
    FROM   expenses
    WHERE  date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
    GROUP  BY month, category
    ORDER  BY month, category
  `.catch(() => [] as ExpRow[])
);

const getSupplierRows = cache(async () =>
  prisma.$queryRaw<SupRow[]>`
    SELECT DATE_TRUNC('month', date)::date      AS month,
           supplier_name,
           SUM(COALESCE(amount_ttc, total_amount))::float AS total
    FROM   invoices
    WHERE  date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
    GROUP  BY month, supplier_name
    ORDER  BY month, supplier_name
  `.catch(() => [] as SupRow[])
);

// ── helpers ──────────────────────────────────────────────────────────
function isoMonth(d: Date) {
  return new Date(d).toISOString().slice(0, 7);
}

function monthLabel(iso: string) {
  const [y, m] = iso.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

function monthLabelLong(iso: string) {
  const [y, m] = iso.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function buildMonthRange(rows: { month: Date }[]): string[] {
  const set = new Set(rows.map((r) => isoMonth(r.month)));
  return Array.from(set).sort();
}

// Last complete month = most recent month before current month that has data
function lastCompleteMonth(months: string[]): string {
  const current = new Date().toISOString().slice(0, 7);
  return months.filter((m) => m < current).at(-1) ?? months.at(-1) ?? "";
}

// ── component ────────────────────────────────────────────────────────
export async function FinanceDonuts({ selectedMonth }: { selectedMonth?: string }) {
  const [expRows, supRows] = await Promise.all([
    getExpenseRows(),
    getSupplierRows(),
  ]);

  // ── Expenses ──────────────────────────────────────────────────────
  const expMonths = buildMonthRange(expRows);
  const expLastMonth = selectedMonth && expMonths.includes(selectedMonth)
    ? selectedMonth
    : lastCompleteMonth(expMonths);

  // Donut: only last complete month
  const expDonutMap = new Map<string, number>();
  for (const r of expRows) {
    if (isoMonth(r.month) === expLastMonth) {
      expDonutMap.set(r.category, (expDonutMap.get(r.category) ?? 0) + r.total);
    }
  }
  const expSorted = [...expDonutMap.entries()].sort((a, b) => b[1] - a[1]);
  const expDonut: DonutSlice[] = expSorted.map(([cat, total], i) => ({
    name:  CATEGORY_LABELS[cat] ?? cat,
    value: Math.round(total),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  // Evolution: all months, same category order as donut
  const expMonthCatMap = new Map<string, Map<string, number>>();
  for (const r of expRows) {
    const mo = isoMonth(r.month);
    if (!expMonthCatMap.has(mo)) expMonthCatMap.set(mo, new Map());
    expMonthCatMap.get(mo)!.set(r.category, r.total);
  }
  const expEvolution: EvolutionSeries[] = expSorted.map(([cat], i) => ({
    name:  CATEGORY_LABELS[cat] ?? cat,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    data:  expMonths.map((mo) => Math.round(expMonthCatMap.get(mo)?.get(cat) ?? 0)),
  }));

  // ── Suppliers ─────────────────────────────────────────────────────
  const supMonths = buildMonthRange(supRows);
  const supLastMonth = selectedMonth && supMonths.includes(selectedMonth)
    ? selectedMonth
    : lastCompleteMonth(supMonths);

  // Donut: only last complete month, top 6
  const supDonutMap = new Map<string, number>();
  for (const r of supRows) {
    if (isoMonth(r.month) === supLastMonth) {
      supDonutMap.set(r.supplier_name, (supDonutMap.get(r.supplier_name) ?? 0) + r.total);
    }
  }
  const supSorted = [...supDonutMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const supDonut: DonutSlice[] = supSorted.map(([name, total], i) => ({
    name:  name.length > 18 ? name.slice(0, 16) + "…" : name,
    value: Math.round(total),
    color: SUPPLIER_COLORS[i % SUPPLIER_COLORS.length],
  }));

  // Evolution: top 3 from last complete month, all months
  const top3 = supSorted.slice(0, 3).map(([name]) => name);
  const supMonthNameMap = new Map<string, Map<string, number>>();
  for (const r of supRows) {
    if (!top3.includes(r.supplier_name)) continue;
    const mo = isoMonth(r.month);
    if (!supMonthNameMap.has(mo)) supMonthNameMap.set(mo, new Map());
    supMonthNameMap.get(mo)!.set(r.supplier_name, r.total);
  }
  const supEvolution: EvolutionSeries[] = top3.map((name, i) => ({
    name:  name.length > 14 ? name.slice(0, 12) + "…" : name,
    color: SUPPLIER_COLORS[i],
    data:  supMonths.map((mo) => Math.round(supMonthNameMap.get(mo)?.get(name) ?? 0)),
  }));

  const expAvailableMonths = expMonths.map((m) => ({ value: m, label: monthLabelLong(m) }));
  const supAvailableMonths = supMonths.map((m) => ({ value: m, label: monthLabelLong(m) }));

  return (
    <>
      <ExpensesChart
        donut={expDonut}
        evolution={expEvolution}
        months={expMonths.map(monthLabel)}
        periodLabel={monthLabelLong(expLastMonth)}
        availableMonths={expAvailableMonths}
        selectedMonth={expLastMonth}
      />
      <SuppliersChart
        donut={supDonut}
        evolution={supEvolution}
        months={supMonths.map(monthLabel)}
        periodLabel={monthLabelLong(supLastMonth)}
        availableMonths={supAvailableMonths}
        selectedMonth={supLastMonth}
      />
    </>
  );
}
