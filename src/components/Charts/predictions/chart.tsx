"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type ChartPoint = {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
  actual: number | null;
  isFuture: boolean;
};

export function PredictionsChart({ data }: { data: ChartPoint[] }) {
  const categories = data.map((d) => d.date);

  const rangeData = data.map((d) => ({
    x: d.date,
    y: [Math.round(d.lower), Math.round(d.upper)],
  }));

  const predictedData = data.map((d) => ({
    x: d.date,
    y: Math.round(d.predicted),
  }));

  const actualData = data.map((d) => ({
    x: d.date,
    y: d.actual != null ? Math.round(d.actual) : null,
  }));

  const options: ApexOptions = {
    chart: {
      type: "rangeArea",
      height: 380,
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: false },
    },
    colors: ["#5750F1", "#5750F1", "#22c55e"],
    fill: {
      opacity: [0.15, 1, 1],
    },
    stroke: {
      curve: "smooth",
      width: [0, 2, 2],
      dashArray: [0, 5, 0],
    },
    dataLabels: { enabled: false },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontFamily: "inherit",
      fontSize: "13px",
      markers: { size: 8 },
    },
    grid: {
      strokeDashArray: 5,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: 10,
      labels: {
        rotate: -35,
        rotateAlways: true,
        style: { fontSize: "11px" },
        offsetY: 4,
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => (val != null ? `${val.toFixed(0)} €` : "0 €"),
        style: { fontSize: "11px" },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (val: number) => (val != null ? `${val.toFixed(0)} €` : "—") },
    },
    annotations: {
      xaxis: [
        {
          x: data.find((d) => d.isFuture)?.date,
          borderColor: "#f97316",
          strokeDashArray: 4,
          label: {
            text: "Aujourd'hui",
            style: { color: "#fff", background: "#f97316", fontSize: "11px" },
          },
        },
      ],
    },
  };

  return (
    <div className="-ml-4 -mr-5">
      <Chart
        options={options}
        series={[
          { name: "Intervalle de confiance", type: "rangeArea", data: rangeData },
          { name: "CA Prédit", type: "line", data: predictedData },
          { name: "CA Réel", type: "line", data: actualData },
        ]}
        type="rangeArea"
        height={380}
      />
    </div>
  );
}
