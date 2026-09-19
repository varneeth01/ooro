# OORO Google Cloud production

The normal deployment is one command from the repository root:

```bash
git pull
./scripts/gcp/deploy-production.sh
```

The script verifies the project and production resources, builds and deploys
the API, checks API and database health, runs Prisma migrations in a Cloud Run
Job, builds and deploys the web service with the exact API URL, updates CORS,
and runs the production acceptance checks. It reads runtime secrets from
Secret Manager and does not create production env files.

Razorpay remains intentionally in test mode (`RAZORPAY_MODE=test`). Razorpay
credentials are not required for deployment. The script does not configure
MongoDB or `MONGODB_URI`; legacy guest-order persistence therefore remains a
separately reported production blocker until that dependency is provisioned.

## First production admin

Run this separately, once:

```bash
./scripts/gcp/bootstrap-admin.sh
```

It asks for the phone, name, and optional email, requires a hidden
`I_UNDERSTAND` confirmation, refuses to run if an admin already exists, and
removes its temporary Cloud Run Job after success. The deployment script never
bootstraps or recreates admins.

## Recovery and logs

```bash
gcloud run services logs read ooro-api --region asia-south1 --limit=100
gcloud run services logs read ooro-web --region asia-south1 --limit=100
gcloud run jobs executions list --job ooro-migrate --region asia-south1
gcloud run jobs executions describe EXECUTION_NAME --job ooro-migrate --region asia-south1
gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="ooro-migrate"' --limit=100
```

Do not print or paste Secret Manager values, database URLs, JWT/session
secrets, credentials, or tokens into logs or source control. The GCS bucket is
not made public by deployment.

## Remaining production blockers

- Legacy guest-order persistence still requires a separately provisioned
  `MONGODB_URI`; this deployment intentionally does not add MongoDB.
- Razorpay is deliberately left in test mode and unconfigured when test
  credentials are absent.
- The deployer must have permission to build, deploy Cloud Run services/jobs,
  attach Cloud SQL, use the service accounts, and update the listed services.
