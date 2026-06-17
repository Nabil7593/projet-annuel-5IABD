import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { NextResponse } from "next/server";

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? "eu-west-3" });

export async function POST() {
  const functionName = process.env.LAMBDA_RETRAIN_FUNCTION;

  if (!functionName) {
    return NextResponse.json(
      { error: "LAMBDA_RETRAIN_FUNCTION manquant dans .env.local" },
      { status: 500 }
    );
  }

  try {
    const res = await lambda.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "Event", // async — ne pas attendre la fin du job SageMaker
      })
    );

    // StatusCode 202 = invocation async acceptée
    if (res.StatusCode === 202) {
      return NextResponse.json({ success: true, message: "Réentraînement lancé" });
    }

    return NextResponse.json(
      { error: `Lambda a répondu avec le code ${res.StatusCode}` },
      { status: 500 }
    );
  } catch (err) {
    console.error("Retrain error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
