#!/usr/bin/env bash
set -Eeuo pipefail

# OORO production deployment. This script intentionally obtains all runtime
# secrets from Secret Manager; it never creates or reads a plaintext env file.

PROJECT="ooro-509014"
REGION="asia-south1"
SQL_INSTANCE="ooro-prod"
SQL_CONNECTION="ooro-509014:asia-south1:ooro-prod"
REPOSITORY="ooro"
API_SERVICE="ooro-api"
WEB_SERVICE="ooro-web"
MIGRATION_JOB="ooro-migrate"
API_IMAGE="asia-south1-docker.pkg.dev/ooro-509014/ooro/ooro-api:latest"
WEB_IMAGE="asia-south1-docker.pkg.dev/ooro-509014/ooro/ooro-web:latest"
API_SA="ooro-api-sa@ooro-509014.iam.gserviceaccount.com"
WEB_SA="ooro-web-sa@ooro-509014.iam.gserviceaccount.com"
BUCKET="ooro-production-creatives-757291597913"
CANONICAL_URL="https://theooro.com"
PNPM_VERSION="9.12.0"

API_URL=""
WEB_URL=""
CURRENT_PHASE="PREFLIGHT"
SUMMARY_PRINTED=0

API_BUILD="FAIL"
API_DEPLOY="FAIL"
DATABASE="FAIL"
MIGRATIONS="FAIL"
WEB_BUILD="FAIL"
WEB_DEPLOY="FAIL"
CORS="FAIL"
PRODUCTION_HEALTH="FAIL"

if [[ -t 1 ]]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; BLUE=""; RESET=""
fi

log() { printf '%s\n' "$*"; }
phase() { CURRENT_PHASE="$1"; printf '\n%s==> %s%s\n' "$BLUE" "$CURRENT_PHASE" "$RESET"; }
pass() { printf '%sPASS%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%sWARN%s %s\n' "$YELLOW" "$RESET" "$*" >&2; }
fail() { printf '%sFAIL%s %s\n' "$RED" "$RESET" "$*" >&2; return 1; }

print_summary() {
  [[ "$SUMMARY_PRINTED" -eq 1 ]] && return
  SUMMARY_PRINTED=1
  printf '\n%s\n' 'OORO PRODUCTION DEPLOYMENT'
  printf 'API BUILD: %s\n' "$API_BUILD"
  printf 'API DEPLOY: %s\n' "$API_DEPLOY"
  printf 'DATABASE: %s\n' "$DATABASE"
  printf 'MIGRATIONS: %s\n' "$MIGRATIONS"
  printf 'WEB BUILD: %s\n' "$WEB_BUILD"
  printf 'WEB DEPLOY: %s\n' "$WEB_DEPLOY"
  printf 'CORS: %s\n' "$CORS"
  printf 'PRODUCTION HEALTH: %s\n' "$PRODUCTION_HEALTH"
  printf '\nAPI URL: %s\n' "${API_URL:-unavailable}"
  printf 'WEB URL: %s\n' "${WEB_URL:-unavailable}"
  printf '\nGit commit deployed: %s\n' "$(git rev-parse --short HEAD 2>/dev/null || printf 'unknown')"
}

on_error() {
  local rc=$?
  printf '%sDeployment stopped during %s (exit %s).%s\n' "$RED" "$CURRENT_PHASE" "$rc" "$RESET" >&2
  if [[ "$CURRENT_PHASE" == "API HEALTH" ]]; then
    warn "Recent Cloud Run API logs:"
    gcloud run services logs read "$API_SERVICE" --region "$REGION" --project "$PROJECT" --limit=50 || true
  fi
  exit "$rc"
}

on_exit() { print_summary; }
trap on_error ERR
trap on_exit EXIT

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is not installed: $1"
}

service_enabled() {
  local service="$1" enabled_services
  enabled_services="$(gcloud services list --enabled --project "$PROJECT" \
    --format='value(config.name)')"
  grep -Fxq -- "$service" <<<"$enabled_services"
}

check_http() {
  local label="$1" url="$2" code
  code="$(curl --silent --show-error --max-time 30 --output /dev/null --write-out '%{http_code}' "$url")"
  printf '%-16s %s (%s)\n' "$label" "$code" "$url"
  [[ "$code" =~ ^2[0-9][0-9]$ ]]
}

check_web_http() {
  local label="$1" url="$2" code
  code="$(curl --silent --show-error --max-time 30 --output /dev/null --write-out '%{http_code}' "$url")"
  printf '%-16s %s (%s)\n' "$label" "$code" "$url"
  [[ "$code" =~ ^[23][0-9][0-9]$ ]]
}

phase "PREFLIGHT"
require_command gcloud
require_command curl
require_command git

pass "gcloud"
gcloud auth list --format='value(account,status)' | awk '$2 == "ACTIVE" { found=1 } END { exit !found }' \
  || fail "No active gcloud account is authenticated"
pass "authentication"
if [[ "$(gcloud config get-value project 2>/dev/null)" != "$PROJECT" ]]; then
  gcloud config set project "$PROJECT" >/dev/null
fi
pass "project $PROJECT"
gcloud config set run/region "$REGION" >/dev/null
pass "region $REGION"

# Builds and migrations run remotely: Cloud Build uses node:20-bookworm-slim,
# and the migration job invokes pnpm inside the built image. Neither Node,
# Corepack, nor pnpm is a local deployment dependency.
if command -v node >/dev/null 2>&1 && NODE_VERSION="$(node --version 2>/dev/null)"; then
  :
else
  NODE_VERSION="node:20-bookworm-slim (Cloud Build)"
fi
log "Node version: $NODE_VERSION"
if command -v corepack >/dev/null 2>&1; then
  log "Corepack: available locally (not required)"
else
  log "Corepack: not installed locally (not required)"
fi
if command -v pnpm >/dev/null 2>&1 && LOCAL_PNPM_VERSION="$(pnpm --version 2>/dev/null)"; then
  log "Local pnpm version: $LOCAL_PNPM_VERSION"
else
  log "Local pnpm: not installed (not required)"
fi
log "pnpm version: $PNPM_VERSION (Cloud Build/Cloud Run)"
log "gcloud version: $(gcloud version 2>/dev/null | sed -n '1p')"
log "active project: $(gcloud config get-value project 2>/dev/null)"

REQUIRED_APIS=(
  run.googleapis.com
  cloudbuild.googleapis.com
  artifactregistry.googleapis.com
  sqladmin.googleapis.com
  secretmanager.googleapis.com
  storage.googleapis.com
)

missing_apis=()
for service in "${REQUIRED_APIS[@]}"; do
  service_enabled "$service" || missing_apis+=("$service")
done

if ((${#missing_apis[@]} > 0)); then
  log "Enabling missing Google APIs: ${missing_apis[*]}"
  gcloud services enable "${REQUIRED_APIS[@]}" --project "$PROJECT"
fi

for service in "${REQUIRED_APIS[@]}"; do
  service_enabled "$service" || fail "Required API could not be enabled: $service"
  pass "API $service"
done

if gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT" >/dev/null 2>&1; then
  pass "Cloud SQL $SQL_INSTANCE"
else
  fail "Cloud SQL instance is missing or inaccessible: $SQL_INSTANCE"
fi

if ! gcloud artifacts repositories describe "$REPOSITORY" --location "$REGION" --project "$PROJECT" >/dev/null 2>&1; then
  log "Artifact Registry $REPOSITORY is missing; creating it"
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --project "$PROJECT" \
    --description="OORO production container images"
fi
gcloud artifacts repositories describe "$REPOSITORY" --location "$REGION" --project "$PROJECT" >/dev/null \
  || fail "Artifact Registry repository could not be verified: $REPOSITORY"
pass "Artifact Registry $REPOSITORY"

gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT" >/dev/null \
  || fail "GCS bucket is missing or inaccessible: $BUCKET"
pass "GCS bucket"

for account in "$API_SA" "$WEB_SA"; do
  gcloud iam service-accounts describe "$account" --project "$PROJECT" >/dev/null \
    || fail "Service account is missing: $account"
done
pass "API service account"
pass "Web service account"

for secret in ooro-database-url ooro-jwt-secret ooro-session-secret; do
  gcloud secrets describe "$secret" --project "$PROJECT" >/dev/null \
    || fail "Secret is missing: $secret"
done
pass "Secret Manager"
[[ -f cloudbuild.api.yaml && -f Dockerfile.api && -f cloudbuild.web.yaml && -f Dockerfile.web ]] \
  || fail "Required build configuration is missing"
pass "build inputs"
log "PREFLIGHT COMPLETE"

phase "API BUILD"
gcloud builds submit --project "$PROJECT" --region "$REGION" --config=cloudbuild.api.yaml .
API_BUILD="PASS"
pass "API image built and pushed"

phase "API DEPLOYMENT"
gcloud run deploy "$API_SERVICE" \
  --project "$PROJECT" --region "$REGION" --image "$API_IMAGE" \
  --service-account "$API_SA" \
  --add-cloudsql-instances "$SQL_CONNECTION" \
  --update-env-vars "NODE_ENV=production,DEV_MOCK_OTP_ENABLED=false,GCS_BUCKET_NAME=$BUCKET,TRACKING_BASE_URL=$CANONICAL_URL,RAZORPAY_MODE=test" \
  --update-secrets "DATABASE_URL=ooro-database-url:latest,JWT_SECRET=ooro-jwt-secret:latest"
API_DEPLOY="PASS"
pass "API service deployed"

phase "API HEALTH"
API_URL="$(gcloud run services describe "$API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
[[ -n "$API_URL" ]] || fail "API service did not return a URL"
log "API URL: $API_URL"
check_http "API health" "$API_URL/api/health"
check_http "DB health" "$API_URL/api/health/db"
DATABASE="PASS"
pass "API and database health checks passed"

phase "PRISMA MIGRATIONS"
gcloud run jobs deploy "$MIGRATION_JOB" \
  --project "$PROJECT" --region "$REGION" --image "$API_IMAGE" \
  --service-account "$API_SA" \
  --add-cloudsql-instances "$SQL_CONNECTION" \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "DATABASE_URL=ooro-database-url:latest,JWT_SECRET=ooro-jwt-secret:latest" \
  --command=pnpm \
  --args=--filter,@ooro/api,exec,prisma,migrate,deploy
gcloud run jobs execute "$MIGRATION_JOB" --project "$PROJECT" --region "$REGION" --wait
MIGRATIONS="PASS"
pass "Prisma migrations completed"

phase "DETERMINE WEB URL"
if WEB_URL="$(gcloud run services describe "$WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)' 2>/dev/null)"; then
  [[ -n "$WEB_URL" ]] && log "Existing web URL: $WEB_URL" || WEB_URL=""
else
  WEB_URL=""
  log "Web service does not exist yet; URL will be obtained after first deployment"
fi

phase "WEB BUILD"
gcloud builds submit --project "$PROJECT" --region "$REGION" --config=cloudbuild.web.yaml \
  --substitutions="_NEXT_PUBLIC_API_URL=$API_URL,_NEXT_PUBLIC_SITE_URL=$CANONICAL_URL" .
WEB_BUILD="PASS"
pass "Web image built and pushed"

phase "WEB DEPLOYMENT"
gcloud run deploy "$WEB_SERVICE" \
  --project "$PROJECT" --region "$REGION" --image "$WEB_IMAGE" \
  --service-account "$WEB_SA" \
  --add-cloudsql-instances "$SQL_CONNECTION" \
  --update-env-vars "NODE_ENV=production,OORO_BACKEND_API_URL=$API_URL,GCS_BUCKET_NAME=$BUCKET,RAZORPAY_MODE=test" \
  --update-secrets "DATABASE_URL=ooro-database-url:latest,OORO_SESSION_SECRET=ooro-session-secret:latest"
WEB_DEPLOY="PASS"
pass "Web service deployed"

phase "FINAL CORS"
WEB_URL="$(gcloud run services describe "$WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
[[ -n "$WEB_URL" ]] || fail "Web service did not return a URL"
log "WEB URL: $WEB_URL"
gcloud run services update "$API_SERVICE" \
  --project "$PROJECT" --region "$REGION" \
  --update-env-vars "^|^CORS_ORIGINS=$WEB_URL,$CANONICAL_URL"
CORS="PASS"
pass "API CORS includes the exact web URL and canonical website"

phase "PRODUCTION ACCEPTANCE"
check_http "API health" "$API_URL/api/health"
check_http "DB health" "$API_URL/api/health/db"
check_web_http "Homepage" "$WEB_URL/"
check_web_http "Signup" "$WEB_URL/signup"
check_web_http "Login" "$WEB_URL/login"
check_web_http "Coverage" "$WEB_URL/coverage"
check_web_http "Admin login" "$WEB_URL/admin/login"
check_web_http "Web DB health" "$WEB_URL/api/health/db"
PRODUCTION_HEALTH="PASS"
pass "Production acceptance checks passed"

print_summary
