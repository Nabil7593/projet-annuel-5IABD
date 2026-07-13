"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { FinanceMonthPicker } from "./month-picker";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type DonutSlice  = { name: string; value: number; color: string };
export type EvolutionSeries = { name: string; data: number[]; color: string };

export function ExpensesChart({
  donut,
  evolution,
  months,
  periodLabel,
  availableMonths,
  selectedMonth,
}: {
  donut: DonutSlice[];
  evolution: EvolutionSeries[];
  months: string[];
  periodLabel: string;
  availableMonths: { value: string; label: string }[];
  selectedMonth: string;
}) {
  const grandTotal = donut.reduce((s, d) => s + d.value, 0);

  const donutOpts: ApexOptions = {
    chart: { type: "donut", animations: { enabled: false }, toolbar: { show: false } },
    labels: donut.map((d) => d.name),
    colors: donut.map((d) => d.color),
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              color: "#6b7280",
              formatter: () =>
                `${grandTotal.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`,
            },
            value: {
              fontSize: "16px",
              fontWeight: 700,
              formatter: (v) =>
                `${parseFloat(v).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`,
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: {
      y: { formatter: (v) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €` },
    },
  };

  const barOpts: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      animations: { enabled: false },
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    plotOptions: { bar: { borderRadius: 2, columnWidth: "70%" } },
    xaxis: {
      categories: months,
      labels: { style: { fontSize: "10px" }, rotate: -30 },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (v) =>
          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v.toFixed(0)}`,
        style: { fontSize: "10px" },
      },
    },
    colors: evolution.map((s) => s.color),
    legend: { show: false },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4, borderColor: "#e5e7eb" },
    tooltip: {
      y: { formatter: (v) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €` },
    },
  };

  return (
    <div className="rounded-[10px] bg-white px-6 pb-6 pt-7 shadow-1 dark:bg-gray-dark dark:shadow-card col-span-12 xl:col-span-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
            Répartition des charges
          </h2>
          <p className="mt-0.5 text-sm text-dark-6 dark:text-dark-4 capitalize">{periodLabel}</p>
        </div>
        <FinanceMonthPicker availableMonths={availableMonths} selectedMonth={selectedMonth} />
      </div>

      <div className="grid grid-cols-2 gap-2 items-start">
        {/* Donut */}
        <div>
          <Chart options={donutOpts} series={donut.map((d) => d.value)} type="donut" height={220} />
          {/* Legend */}
          <div className="mt-2 space-y-1 px-1">
            {donut.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-dark-6 dark:text-dark-4">{d.name}</span>
                </span>
                <span className="font-medium text-dark dark:text-white">
                  {d.value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar evolution */}
        <div>
          <p className="mb-1 text-xs font-semibold text-dark-6 dark:text-dark-4 uppercase tracking-wider">
            Évolution mensuelle
          </p>
          <Chart
            options={barOpts}
            series={evolution.map((s) => ({ name: s.name, data: s.data }))}
            type="bar"
            height={220}
          />
          {/* Legend for bar */}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 px-1">
            {evolution.map((s) => (
              <span key={s.name} className="flex items-center gap-1 text-[10px] text-dark-6 dark:text-dark-4">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
