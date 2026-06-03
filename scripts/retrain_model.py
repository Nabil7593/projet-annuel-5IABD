"""
SageMaker Processing Job script — Prophet CA retraining
Runs inside a SageMaker sklearn container.
Required env vars (passed via Processing Job environment):
  DATABASE_URL  : PostgreSQL connection string
  S3_BUCKET     : e.g. restolens-models
"""
import os, json, pickle, subprocess, sys
from datetime import date, timedelta

# Install deps not in the base sklearn container
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q",
                       "prophet", "pg8000", "sqlalchemy"])

import pandas as pd
from prophet import Prophet
from sqlalchemy import create_engine, text
import boto3

# ── Config ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://restolens_admin:restolensrds@restolens-db.c90ioo6865gi.eu-west-3.rds.amazonaws.com:5432/restolens?schema=public")
S3_BUCKET    = os.environ.get("S3_BUCKET", "restolens-models")
HORIZON_DAYS = 30       # how many future days to predict
CI_WIDTH     = 0.80     # 80 % confidence interval

# ── 1. Read historical data from RDS ─────────────────────────────────────────
print("Reading historical CA from RDS...")

# pg8000 is pure-Python — no native libs needed inside the container
db_url = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://").replace(
    "?schema=public", ""
)
engine = create_engine(db_url, connect_args={"ssl_context": True})

with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT date, total FROM daily_revenues ORDER BY date ASC"
    )).fetchall()

df = pd.DataFrame(rows, columns=["ds", "y"])
df["ds"] = pd.to_datetime(df["ds"])
print(f"  {len(df)} rows loaded, from {df['ds'].min().date()} to {df['ds'].max().date()}")

# ── 2. French public holidays ─────────────────────────────────────────────────
fr_holidays = pd.DataFrame({
    "holiday": ["reveillon_noel", "noel", "lendemain_noel", "reveillon_sylvestre"],
    "ds": pd.to_datetime(["2024-12-24","2024-12-25","2024-12-26","2024-12-31"]),
    "lower_window": [0, 0, 0, 0],
    "upper_window": [0, 0, 0, 0],
})

# ── 3. Train Prophet model ────────────────────────────────────────────────────
print("Training Prophet model...")
model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    holidays=fr_holidays,
    holidays_mode="additive",
    seasonality_mode="additive",
    changepoint_prior_scale=0.05,
    interval_width=CI_WIDTH,
)
model.add_country_holidays(country_name="FR")
model.fit(df)
print("  Training complete.")

# ── 4. Generate predictions ───────────────────────────────────────────────────
last_date = df["ds"].max().date()
future_start = last_date + timedelta(days=1)

future = model.make_future_dataframe(periods=HORIZON_DAYS, freq="D")
forecast = model.predict(future)

results = []
for _, row in forecast.iterrows():
    d = row["ds"].date()
    results.append({
        "date": str(d),
        "predicted": round(float(row["yhat"]), 2),
        "lower":     round(float(row["yhat_lower"]), 2),
        "upper":     round(float(row["yhat_upper"]), 2),
        "is_future": d >= future_start,
    })

# Keep last 31 historical + all future
historical = [r for r in results if not r["is_future"]][-31:]
future_preds = [r for r in results if r["is_future"]]
predictions = historical + future_preds

print(f"  {len(historical)} historical + {len(future_preds)} future predictions")

# ── 5. Save to S3 ────────────────────────────────────────────────────────────
today_str = date.today().strftime("%Y_%m")
s3 = boto3.client("s3")

# predictions.json
preds_json = json.dumps(predictions, ensure_ascii=False, indent=2)
s3.put_object(Bucket=S3_BUCKET, Key="predictions.json",
               Body=preds_json.encode(), ContentType="application/json")
print(f"  Uploaded predictions.json ({len(predictions)} entries)")

# ca_model_latest.pkl
model_bytes = pickle.dumps(model)
s3.put_object(Bucket=S3_BUCKET, Key="ca_model_latest.pkl",
               Body=model_bytes, ContentType="application/octet-stream")

# versioned copy  e.g. ca_model_2026_06.pkl
s3.put_object(Bucket=S3_BUCKET, Key=f"ca_model_{today_str}.pkl",
               Body=model_bytes, ContentType="application/octet-stream")

print(f"  Uploaded ca_model_latest.pkl + ca_model_{today_str}.pkl")
print("Done ✓")
