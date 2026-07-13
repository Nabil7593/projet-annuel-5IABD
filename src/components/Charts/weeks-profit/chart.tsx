"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type MonthPoint = { x: string; ca: number; resultat: number; costs: number };

export function MonthlyResultChart({ data }: { data: MonthPoint[] }) {
  const options: ApexOptions = {
    colors: ["#5750F1", "#0ABEF9"],
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 3,
        columnWidth: "55%",
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "last",
      },
    },
    dataLabels: { enabled: false },
    grid: {
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: data.map((d) => d.x),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px" }, rotate: -30 },
    },
    yaxis: {
      labels: {
        formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`,
        style: { fontSize: "11px" },
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontFamily: "inherit",
      fontWeight: 500,
      fontSize: "13px",
      markers: { size: 9, shape: "circle" },
    },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ dataPointIndex }) => {
        const d = data[dataPointIndex];
        if (!d) return "";
        return `
          <div style="padding:10px 14px;font-size:12px;line-height:1.8">
            <div style="font-weight:700;margin-bottom:4px">${d.x}</div>
            <div><span style="color:#0ABEF9">●</span> CA total : <b>${d.ca.toLocaleString("fr-FR")} €</b></div>
            <div><span style="color:#5750F1">●</span> Résultat net : <b style="color:${d.resultat >= 0 ? "#22c55e" : "#ef4444"}">${d.resultat.toLocaleString("fr-FR")} €</b></div>
          </div>`;
      },
    },
    fill: { opacity: 1 },
  };

  return (
    <div className="-ml-3.5 mt-3">
      <Chart
        options={options}
        series={[
          { name: "Résultat net", data: data.map((d) => Math.max(d.resultat, 0)) },
          { name: "Coûts",        data: data.map((d) => d.costs) },
        ]}
        type="bar"
        height={370}
      />
    </div>
  );
}
