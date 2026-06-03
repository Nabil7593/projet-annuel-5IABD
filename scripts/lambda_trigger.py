"""
AWS Lambda function — triggered by EventBridge monthly cron.
Starts a SageMaker Processing Job to retrain the Prophet model.

Deploy this code in a Lambda function (Python 3.12, ~128 MB memory).
Environment variables to set in Lambda:
  SAGEMAKER_ROLE_ARN : arn:aws:iam::119004746797:role/restolens-sagemaker-role
  S3_BUCKET          : restolens-models
  DATABASE_URL       : postgresql://restolens_admin:...@.../restolens?schema=public
  REGION             : eu-west-3
"""
import boto3, os
from datetime import datetime

REGION           = os.environ.get("REGION", "eu-west-3")
SAGEMAKER_ROLE   = os.environ["SAGEMAKER_ROLE_ARN"]
S3_BUCKET        = os.environ.get("S3_BUCKET", "restolens-models")
DATABASE_URL     = os.environ["DATABASE_URL"]
SCRIPT_S3_KEY    = "scripts/retrain_model.py"

sm = boto3.client("sagemaker", region_name=REGION)
s3 = boto3.client("s3", region_name=REGION)


def handler(event, context):
    job_name = f"restolens-retrain-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    print(f"Starting SageMaker Processing Job: {job_name}")

    response = sm.create_processing_job(
        ProcessingJobName=job_name,
        RoleArn=SAGEMAKER_ROLE,

        # Use the SageMaker sklearn container (has Python + scipy pre-installed)
        AppSpecification={
            "ImageUri": f"341280168497.dkr.ecr.{REGION}.amazonaws.com/sagemaker-scikit-learn:1.2-1",
            "ContainerEntrypoint": ["python3", "/opt/ml/processing/input/code/retrain_model.py"],
        },

        ProcessingInputs=[
            {
                "InputName": "code",
                "S3Input": {
                    "S3Uri": f"s3://{S3_BUCKET}/{SCRIPT_S3_KEY}",
                    "LocalPath": "/opt/ml/processing/input/code",
                    "S3DataType": "S3Prefix",
                    "S3InputMode": "File",
                },
            }
        ],

        Environment={
            "DATABASE_URL": DATABASE_URL,
            "S3_BUCKET":    S3_BUCKET,
        },

        ProcessingResources={
            "ClusterConfig": {
                "InstanceCount":  1,
                "InstanceType":   "ml.t3.medium",
                "VolumeSizeInGB": 5,
            }
        },

        StoppingCondition={"MaxRuntimeInSeconds": 3600},
    )

    print(f"Job started: {response['ProcessingJobArn']}")
    return {"jobName": job_name, "arn": response["ProcessingJobArn"]}
