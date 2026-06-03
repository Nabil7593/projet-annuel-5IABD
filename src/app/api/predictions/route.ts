import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export type Prediction = {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
  is_future: boolean;
};

async function fetchFromS3(): Promise<Prediction[]> {
  const client = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-3" });
  const cmd = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET ?? "restolens-models",
    Key: "predictions.json",
  });
  const res = await client.send(cmd);
  const body = await res.Body!.transformToString();
  return JSON.parse(body);
}

function fetchFromLocal(): Prediction[] {
  const filePath = path.join(process.cwd(), "predictions.json");
  const body = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(body);
}

export async function GET() {
  try {
    let data: Prediction[];
    try {
      data = await fetchFromS3();
    } catch {
      data = fetchFromLocal();
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
