"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function MiniSparkline({ data, color = "#5750F1" }: { data: number[]; color?: string }) {
  if (!data.length) return <div className="h-[60px]" />;

  const options: ApexOptions = {
    chart: {
      type: "area",
      sparkline: { enabled: true },
      animations: { enabled: false },
    },
    colors: [color],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.35, opacityTo: 0.02 },
    },
    tooltip: {
      enabled: true,
      x: { show: false },
      y: { formatter: (v: number) => `${v.toLocaleString("fr-FR")} €` },
    },
  };

  return (
    <Chart
      options={options}
      series={[{ name: "CA", data }]}
      type="area"
      height={60}
    />
  );
}

export function RatioBar({
  value,
  threshold,
  thresholdLabel,
}: {
  value: number;
  threshold: number;
  thresholdLabel?: string;
}) {
  const pct = Math.min(Math.max(value, 0), 120); // cap display at 120%
  const isHigh = value > threshold;
  const isWarn = value > threshold * 0.85;

  const barColor = isHigh ? "#ef4444" : isWarn ? "#f97316" : "#22c55e";
  const thresholdPct = Math.min((threshold / 120) * 100, 100);
  const barWidthPct  = Math.min((pct / 120) * 100, 100);

  return (
    <div>
      <div className="relative mt-2 h-2.5 rounded-full bg-gray-200 dark:bg-dark-3">
        <div
          className="absolute left-0 top-0 h-2.5 rounded-full transition-all"
          style={{ width: `${barWidthPct}%`, backgroundColor: barColor }}
        />
        {/* threshold marker */}
        <div
          className="absolute top-[-3px] h-[18px] w-[2px] rounded-full bg-dark-6 dark:bg-dark-4"
          style={{ left: `${thresholdPct}%` }}
          title={thresholdLabel ?? `Seuil: ${threshold}%`}
        />
      </div>
      <p className="mt-1 text-xs text-dark-6 dark:text-dark-4">
        Seuil recommandé : {threshold}%
        {isHigh && (
          <span className="ml-2 font-semibold text-red-500">▲ au-dessus</span>
        )}
      </p>
    </div>
  );
}
