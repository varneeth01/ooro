#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="ooro-509014"
REGION="asia-south1"
JOB="ooro-admin-bootstrap"
API_IMAGE="asia-south1-docker.pkg.dev/ooro-509014/ooro/ooro-api:latest"
API_SA="ooro-api-sa@ooro-509014.iam.gserviceaccount.com"
SQL_CONNECTION="ooro-509014:asia-south1:ooro-prod"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
command -v gcloud >/dev/null 2>&1 || die "gcloud is required"

gcloud config set project "$PROJECT" >/dev/null

printf 'This creates the first SUPER_ADMIN only. It refuses to run if any admin exists.\n'
read -r -p 'Admin phone: ' admin_phone
read -r -p 'Admin name: ' admin_name
read -r -p 'Admin email (optional): ' admin_email
read -r -s -p 'Type I_UNDERSTAND to confirm: ' confirmation
printf '\n'
[[ "$confirmation" == "I_UNDERSTAND" ]] || die "Confirmation did not match"
[[ -n "$admin_phone" && -n "$admin_name" ]] || die "Phone and name are required"

# Values are passed only to this temporary Cloud Run Job. The job is deleted
# after success and this script never prints them or writes them to a file.
gcloud run jobs deploy "$JOB" \
  --project "$PROJECT" --region "$REGION" --image "$API_IMAGE" \
  --service-account "$API_SA" \
  --add-cloudsql-instances "$SQL_CONNECTION" \
  --set-env-vars "^|^NODE_ENV=production|ADMIN_BOOTSTRAP_CONFIRM=I_UNDERSTAND|ADMIN_BOOTSTRAP_PHONE=$admin_phone|ADMIN_BOOTSTRAP_NAME=$admin_name|ADMIN_BOOTSTRAP_EMAIL=$admin_email" \
  --set-secrets "DATABASE_URL=ooro-database-url:latest,JWT_SECRET=ooro-jwt-secret:latest" \
  --command=pnpm \
  --args=--filter,@ooro/api,admin:bootstrap

if gcloud run jobs execute "$JOB" --project "$PROJECT" --region "$REGION" --wait; then
  gcloud run jobs delete "$JOB" --project "$PROJECT" --region "$REGION" --quiet
  unset admin_phone admin_name admin_email confirmation
  printf 'First production admin created; temporary bootstrap job removed.\n'
else
  rc=$?
  printf 'Bootstrap failed; temporary job retained as %s for log inspection.\n' "$JOB" >&2
  exit "$rc"
fi
