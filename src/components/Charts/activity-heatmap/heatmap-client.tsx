"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ── tooltip ──────────────────────────────────────────────────────────
type TooltipState = { x: number; y: number; label: string; total: number } | null;

function Tooltip({ tip }: { tip: TooltipState }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg bg-dark px-3 py-2 text-sm text-white shadow-xl dark:bg-dark-2 dark:border dark:border-dark-3"
      style={{ left: tip.x + 12, top: tip.y - 10 }}
    >
      <p className="font-semibold">{tip.label}</p>
      <p className="text-primary font-bold">
        {tip.total > 0
          ? `${tip.total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`
          : "Aucune donnée"}
      </p>
    </div>
  );
}

export type DayData = { date: string; total: number };
export type MonthData = { value: string; label: string; total: number };

// ── color intensity ─────────────────────────────────────────────────
function cellStyle(total: number, max: number) {
  if (total === 0) return { bg: "bg-gray-100 dark:bg-dark-3", text: "text-dark-6 dark:text-dark-4" };
  const pct = total / max;
  if (pct < 0.25) return { bg: "bg-primary/20",  text: "text-primary" };
  if (pct < 0.50) return { bg: "bg-primary/40",  text: "text-primary" };
  if (pct < 0.75) return { bg: "bg-primary/70",  text: "text-white" };
  return               { bg: "bg-primary",        text: "text-white" };
}

// ── calendar grid ────────────────────────────────────────────────────
function CalendarGrid({ month, days }: { month: string; days: DayData[] }) {
  const [yr, mo] = month.split("-").map(Number);
  const firstDow = (new Date(yr, mo - 1, 1).getDay() + 6) % 7;
  const lastDate = new Date(yr, mo, 0).getDate();
  const [tip, setTip] = useState<TooltipState>(null);

  const dayMap = new Map(days.map((d) => [parseInt(d.date.slice(8), 10), d.total]));
  const max = Math.max(...days.map((d) => d.total), 1);

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: lastDate }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const DOW_LABELS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
  const MONTH_FR = ["janvier", "février", "mars", "avril", "mai", "juin",
                    "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  return (
    <div className="w-full">
      <Tooltip tip={tip} />

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-dark-6 dark:text-dark-4 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((day, di) => {
            if (!day) return <div key={di} className="aspect-square" />;
            const total = dayMap.get(day) ?? 0;
            const { bg, text } = cellStyle(total, max);
            return (
              <div
                key={di}
                onMouseMove={(e) =>
                  setTip({
                    x: e.clientX,
                    y: e.clientY,
                    label: `${String(day).padStart(2, "0")} ${MONTH_FR[mo - 1]} ${yr}`,
                    total,
                  })
                }
                onMouseLeave={() => setTip(null)}
                className={cn(
                  "aspect-square rounded flex items-center justify-center text-[11px] font-medium cursor-default transition-all hover:ring-2 hover:ring-primary hover:ring-offset-1",
                  bg, text
                )}
              >
                {day}
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-dark-6 dark:text-dark-4">Faible</span>
        {["bg-primary/20", "bg-primary/40", "bg-primary/70", "bg-primary"].map((c) => (
          <div key={c} className={cn("h-3 w-5 rounded", c)} />
        ))}
        <span className="text-[11px] text-dark-6 dark:text-dark-4">Fort</span>
        <div className="ml-2 h-3 w-5 rounded bg-gray-100 dark:bg-dark-3 border border-stroke dark:border-dark-3" />
        <span className="text-[11px] text-dark-6 dark:text-dark-4">Pas de données</span>
      </div>
    </div>
  );
}

// ── monthly bars ─────────────────────────────────────────────────────
function MonthBars({
  months,
  selectedMonth,
  onSelect,
}: {
  months: MonthData[];
  selectedMonth: string;
  onSelect: (m: string) => void;
}) {
  // Show last 18 months max
  const visible = months.slice(-18);
  const max = Math.max(...visible.map((m) => m.total), 1);

  const best = visible.reduce((a, b) => (b.total > a.total ? b : a), visible[0]);

  return (
    <div className="flex flex-col h-full">
      <p className="mb-3 text-sm font-semibold text-dark dark:text-white">Activité mensuelle</p>

      <div className="flex items-end gap-1 flex-1 min-h-[120px]">
        {visible.map((m) => {
          const heightPct = (m.total / max) * 100;
          const isSelected = m.value === selectedMonth;
          return (
            <button
              key={m.value}
              onClick={() => onSelect(m.value)}
              title={`${m.label} — ${m.total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`}
              className="flex flex-1 flex-col items-center gap-0.5 group"
            >
              <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
                <div
                  className={cn(
                    "w-full rounded-t transition-all",
                    isSelected ? "bg-primary" : "bg-primary/25 group-hover:bg-primary/50"
                  )}
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isSelected ? "text-primary" : "text-dark-6 dark:text-dark-4"
              )}>
                {m.label.slice(0, 3).charAt(0).toUpperCase() + m.label.slice(1, 3)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-stroke pt-4 dark:border-dark-3">
        <div>
          <p className="text-xs text-dark-6 dark:text-dark-4">Meilleur mois</p>
          <p className="mt-0.5 text-sm font-bold text-dark dark:text-white capitalize">{best?.label ?? "—"}</p>
          <p className="text-xs text-primary font-medium">
            {best ? `${best.total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs text-dark-6 dark:text-dark-4">Mois sélectionné</p>
          <p className="mt-0.5 text-sm font-bold text-dark dark:text-white capitalize">
            {months.find((m) => m.value === selectedMonth)?.label ?? "—"}
          </p>
          <p className="text-xs text-primary font-medium">
            {(() => {
              const t = months.find((m) => m.value === selectedMonth)?.total ?? 0;
              return t ? `${t.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €` : "—";
            })()}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── month dropdown ───────────────────────────────────────────────────
function MonthDropdown({
  months,
  selected,
  onSelect,
}: {
  months: MonthData[];
  selected: string;
  onSelect: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = months.find((m) => m.value === selected);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1.5 rounded-md border border-stroke bg-white px-3 text-sm font-medium text-dark-5 transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-dark-4 dark:hover:bg-dark-3 capitalize"
      >
        {current?.label ?? selected}
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 max-h-60 w-48 overflow-y-auto rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
          {[...months].reverse().map((m) => (
            <button
              key={m.value}
              onClick={() => { onSelect(m.value); setOpen(false); }}
              className={cn(
                "block w-full px-3 py-2 text-left text-sm font-medium transition hover:bg-gray-2 dark:hover:bg-dark-3 capitalize",
                m.value === selected ? "text-primary" : "text-dark-5 dark:text-dark-4"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── main client component ────────────────────────────────────────────
export function HeatmapClient({
  selectedMonth,
  months,
  days,
  className,
}: {
  selectedMonth: string;
  months: MonthData[];
  days: DayData[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(month: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("heatmap_month", month);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const monthLabel = months.find((m) => m.value === selectedMonth)?.label ?? selectedMonth;

  return (
    <div className={cn(
      "rounded-[10px] bg-white px-7.5 pb-6 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
      className
    )}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white capitalize">
            Activité journalière — {monthLabel}
          </h2>
          <p className="mt-0.5 text-sm font-medium text-dark-6 dark:text-dark-4">
            Intensité du chiffre d&apos;affaires par jour
          </p>
        </div>
        <MonthDropdown months={months} selected={selectedMonth} onSelect={navigate} />
      </div>

      {/* Body: 2 columns */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {/* Left: calendar */}
        {days.length > 0 ? (
          <CalendarGrid month={selectedMonth} days={days} />
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-dark-6 dark:text-dark-4">
            Aucune donnée pour ce mois.
          </div>
        )}

        {/* Right: monthly bars */}
        {months.length > 0 ? (
          <MonthBars months={months} selectedMonth={selectedMonth} onSelect={navigate} />
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-dark-6 dark:text-dark-4">
            Aucune donnée mensuelle.
          </div>
        )}
      </div>
    </div>
  );
}
