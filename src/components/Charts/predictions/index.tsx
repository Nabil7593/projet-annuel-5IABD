import { getAllDailyRevenues } from "@/lib/db-cache";
import { cn } from "@/lib/utils";
import type { Prediction } from "@/app/api/predictions/route";
import { PredictionsChart, type ChartPoint } from "./chart";
import { RetrainButton } from "./retrain-button";
import path from "path";
import fs from "fs";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

async function fetchPredictions(): Promise<Prediction[]> {
  try {
    const client = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-3" });
    const cmd = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET ?? "restolens-models",
      Key: "predictions.json",
    });
    const res = await client.send(cmd);
    const body = await res.Body!.transformToString();
    return JSON.parse(body);
  } catch {
    const filePath = path.join(process.cwd(), "predictions.json");
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
}

export async function PredictionsOverview({ className }: { className?: string }) {
  const [predictions, revenues] = await Promise.all([
    fetchPredictions(),
    getAllDailyRevenues(),
  ]);

  const revenueMap = new Map(
    revenues.map((r) => {
      const key = new Date(new Date(r.date).getTime() + 12 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      return [key, r.total];
    })
  );

  const data: ChartPoint[] = predictions.map((p) => ({
    date: new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    predicted: p.predicted,
    lower: p.lower,
    upper: p.upper,
    actual: revenueMap.get(p.date) ?? null,
    isFuture: p.is_future,
  }));

  const futurePredictions = predictions.filter((p) => p.is_future);
  const avgFuture =
    futurePredictions.length > 0
      ? futurePredictions.reduce((s, p) => s + p.predicted, 0) / futurePredictions.length
      : 0;

  return (
    <div
      className={cn(
        "rounded-[10px] bg-white px-7.5 pb-6 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
            Prévisions de CA
          </h2>
          <p className="mt-0.5 text-sm font-medium text-dark-6 dark:text-dark-4">
            Modèle Prophet — historique + {futurePredictions.length} jours à venir
          </p>
        </div>

        <div className="flex items-start gap-6">
          <div className="text-right">
            <p className="text-xs font-medium text-dark-6 dark:text-dark-4">Moy. prédite (à venir)</p>
            <p className="text-xl font-bold text-primary">
              {avgFuture.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
            </p>
          </div>
          <RetrainButton />
        </div>
      </div>

      <PredictionsChart data={data} />
    </div>
  );
}
