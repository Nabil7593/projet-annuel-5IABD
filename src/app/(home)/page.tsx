import { RevenueOverview } from "@/components/Charts/revenue-overview";
import { PredictionsOverview } from "@/components/Charts/predictions";
import { ActivityHeatmap } from "@/components/Charts/activity-heatmap";
import { FinanceDonuts } from "@/components/Charts/finance-donuts";
import { WeeksProfit } from "@/components/Charts/weeks-profit";
import { createTimeFrameExtractor } from "@/utils/timeframe-extractor";
import { Suspense } from "react";
import { OverviewCardsGroup } from "./_components/overview-cards";
import { OverviewCardsSkeleton } from "./_components/overview-cards/skeleton";

type PropsType = {
  searchParams: Promise<{
    selected_time_frame?: string;
    date_from?: string;
    date_to?: string;
    kpi_from?: string;
    kpi_to?: string;
    heatmap_month?: string;
    finance_month?: string;
  }>;
};

export default async function Home({ searchParams }: PropsType) {
  const { selected_time_frame, date_from, date_to, kpi_from, kpi_to, heatmap_month, finance_month } =
    await searchParams;
  const extractTimeFrame = createTimeFrameExtractor(selected_time_frame);

  return (
    <>
      <Suspense fallback={<OverviewCardsSkeleton />}>
        <OverviewCardsGroup
          period={extractTimeFrame("kpi_cards")?.split(":")[1]}
          kpiFrom={kpi_from}
          kpiTo={kpi_to}
        />
      </Suspense>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
        <Suspense
          fallback={
            <div className="col-span-12 h-[430px] animate-pulse rounded-[10px] bg-gray-2 dark:bg-dark-2 xl:col-span-7" />
          }
        >
          <RevenueOverview
            className="col-span-12 xl:col-span-7"
            key={`${extractTimeFrame("revenue_overview")}-${date_from}-${date_to}`}
            timeFrame={extractTimeFrame("revenue_overview")?.split(":")[1]}
            dateFrom={date_from}
            dateTo={date_to}
          />
        </Suspense>

        <WeeksProfit
          key={extractTimeFrame("weeks_profit")}
          timeFrame={extractTimeFrame("weeks_profit")?.split(":")[1]}
          className="col-span-12 xl:col-span-5"
        />

        <Suspense
          fallback={
            <div className="col-span-12 h-[380px] animate-pulse rounded-[10px] bg-gray-2 dark:bg-dark-2" />
          }
        >
          <ActivityHeatmap selectedMonth={heatmap_month} />
        </Suspense>

        <Suspense
          fallback={
            <div className="col-span-12 grid grid-cols-2 gap-4">
              <div className="h-[420px] animate-pulse rounded-[10px] bg-gray-2 dark:bg-dark-2" />
              <div className="h-[420px] animate-pulse rounded-[10px] bg-gray-2 dark:bg-dark-2" />
            </div>
          }
        >
          <FinanceDonuts selectedMonth={finance_month} />
        </Suspense>

        <Suspense
          fallback={
            <div className="col-span-12 h-[480px] animate-pulse rounded-[10px] bg-gray-2 dark:bg-dark-2" />
          }
        >
          <PredictionsOverview className="col-span-12" />
        </Suspense>
      </div>
    </>
  );
}
