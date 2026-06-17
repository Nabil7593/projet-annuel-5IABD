"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const KPI_PERIODS = [
  { key: "prev-month", label: "Mois précédent" },
  { key: "cur-month",  label: "Mois en cours"  },
  { key: "custom",     label: "Personnalisé"    },
] as const;

export type KpiPeriodKey = (typeof KPI_PERIODS)[number]["key"];

function setTfParam(searchParams: URLSearchParams, key: string) {
  const tf = searchParams.get("selected_time_frame") ?? "";
  const cleaned = tf.split(",").filter((s) => !s.startsWith("kpi_cards:")).join(",");
  searchParams.set("selected_time_frame", cleaned ? `${cleaned},kpi_cards:${key}` : `kpi_cards:${key}`);
}

export function KpiPeriodPicker({
  value,
  kpiFrom,
  kpiTo,
}: {
  value: string;
  kpiFrom?: string;
  kpiTo?: string;
}) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen]     = useState(false);
  const [from, setFrom]     = useState(kpiFrom ?? "");
  const [to,   setTo]       = useState(kpiTo   ?? "");

  const current = KPI_PERIODS.find((p) => p.key === value) ?? KPI_PERIODS[0];

  function select(key: string) {
    if (key === "custom") { setOpen(true); return; }
    const params = new URLSearchParams(searchParams.toString());
    setTfParam(params, key);
    params.delete("kpi_from");
    params.delete("kpi_to");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  function applyCustom() {
    if (!from || !to || from > to) return;
    const params = new URLSearchParams(searchParams.toString());
    setTfParam(params, "custom");
    params.set("kpi_from", from);
    params.set("kpi_to",   to);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  const displayLabel =
    value === "custom" && kpiFrom && kpiTo
      ? `${new Date(kpiFrom).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })} → ${new Date(kpiTo).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}`
      : current.label;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1.5 rounded-md border border-stroke bg-white px-3 text-sm font-medium text-dark-5 transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-dark-4 dark:hover:bg-dark-3"
      >
        {displayLabel}
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 min-w-[220px] rounded-lg border border-stroke bg-white p-2 shadow-lg dark:border-dark-3 dark:bg-dark-2">
          {KPI_PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => select(p.key)}
              className={`block w-full rounded px-3 py-2 text-left text-sm font-medium transition hover:bg-gray-2 dark:hover:bg-dark-3 ${
                p.key === value ? "text-primary" : "text-dark-5 dark:text-dark-4"
              }`}
            >
              {p.label}
            </button>
          ))}

          {/* Custom date range inputs */}
          <div className="mt-2 border-t border-stroke pt-2 dark:border-dark-3">
            <p className="mb-1.5 px-1 text-xs font-medium text-dark-6 dark:text-dark-4">Période personnalisée</p>
            <div className="flex flex-col gap-1.5 px-1">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded border border-stroke bg-white px-2 py-1 text-xs text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white"
              />
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="rounded border border-stroke bg-white px-2 py-1 text-xs text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white"
              />
              <button
                onClick={applyCustom}
                disabled={!from || !to || from > to}
                className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
