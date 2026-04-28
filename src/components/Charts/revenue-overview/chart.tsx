"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type DataPoint = {
  date: string;
  total: number;
  cash: number;
  card: number;
  ticketResto: number;
  uber: number;
};

type PropsType = {
  data: DataPoint[];
  timeFrame?: string;
};

const HIDDEN_BY_DEFAULT = ["Cash", "Carte Bancaire", "Ticket Resto", "Uber Eats"];

// Config xaxis selon la période
function getXAxisConfig(timeFrame: string): ApexOptions["xaxis"] {
  if (timeFrame === "semaine") {
    return {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: 0,
        style: { fontSize: "12px" },
      },
    };
  }

  if (timeFrame === "annee") {
    return {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: 0,
        style: { fontSize: "11px" },
      },
    };
  }

  // mensuel : 30 points → on affiche ~8 labels, légèrement inclinés
  return {
    axisBorder: { show: false },
    axisTicks: { show: false },
    tickAmount: 8,
    labels: {
      rotate: -35,
      rotateAlways: true,
      style: { fontSize: "11px" },
      offsetY: 4,
    },
  };
}

export function RevenueOverviewChart({ data, timeFrame = "mensuel" }: PropsType) {
  const categories = data.map((d) => d.date);

  // Hauteur du graphique un peu plus grande en mensuel pour laisser de la place aux labels inclinés
  const chartHeight = timeFrame === "mensuel" ? 340 : 320;

  const options: ApexOptions = {
    chart: {
      height: chartHeight,
      type: "area",
      toolbar: { show: false },
      fontFamily: "inherit",
      events: {
        mounted: (chart: any) => {
          HIDDEN_BY_DEFAULT.forEach((name) => chart.hideSeries(name));
        },
      },
    },
    colors: ["#5750F1", "#22c55e", "#0ABEF9", "#f97316", "#ec4899"],
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontFamily: "inherit",
      fontSize: "13px",
      markers: { size: 8 },
      itemMargin: { horizontal: 8 },
      onItemClick: { toggleDataSeries: true },
      onItemHover: { highlightDataSeries: true },
    },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.45, opacityTo: 0.03 },
    },
    stroke: { curve: "smooth", width: 2.5 },
    dataLabels: { enabled: false },
    grid: {
      strokeDashArray: 5,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories,
      ...getXAxisConfig(timeFrame),
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `${val.toFixed(0)} €`,
        style: { fontSize: "11px" },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (val: number) => `${val.toFixed(2)} €` },
    },
    responsive: [
      { breakpoint: 1024, options: { chart: { height: chartHeight - 40 } } },
    ],
  };

  return (
    <div className="-ml-4 -mr-5">
      <Chart
        options={options}
        series={[
          { name: "CA Total", data: data.map((d) => d.total) },
          { name: "Cash", data: data.map((d) => d.cash) },
          { name: "Carte Bancaire", data: data.map((d) => d.card) },
          { name: "Ticket Resto", data: data.map((d) => d.ticketResto) },
          { name: "Uber Eats", data: data.map((d) => d.uber) },
        ]}
        type="area"
        height={chartHeight}
      />
    </div>
  );
}
