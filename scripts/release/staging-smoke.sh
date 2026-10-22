#!/usr/bin/env bash
set -euo pipefail

# Credential-free checks are safe to run against staging. Set ADMIN_EMAIL and
# ADMIN_PASSWORD only in a protected shell when an operator-approved admin
# workflow test is intended. The script never prints either value or tokens.

BASE_URL="${BASE_URL:-https://staging.theooro.com}"
API_URL="${API_URL:-https://api-staging.theooro.com}"
REQUIRE_ADMIN="${SMOKE_REQUIRE_ADMIN:-false}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ooro-staging-smoke.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

pass=0
fail=0
skip=0

check_status() {
  local name="$1" expected="$2" method="$3" url="$4" body="${5:-}"
  local output status
  if [[ -n "$body" ]]; then
    output="$(curl -sS --max-time 20 -X "$method" -H 'content-type: application/json' --data "$body" -o "$TMP_DIR/body" -w '%{http_code}' "$url")" || output="000"
  else
    output="$(curl -sS --max-time 20 -X "$method" -o "$TMP_DIR/body" -w '%{http_code}' "$url")" || output="000"
  fi
  status="$output"
  if [[ "$status" == "$expected" ]]; then
    printf 'PASS %-32s %s\n' "$name" "$status"
    pass=$((pass + 1))
  else
    printf 'FAIL %-32s expected=%s actual=%s\n' "$name" "$expected" "$status"
    fail=$((fail + 1))
  fi
}

check_status "website admin login page" 200 GET "$BASE_URL/admin/login"
check_status "API liveness" 200 GET "$API_URL/health"
check_status "API health alias" 200 GET "$API_URL/api/health"
check_status "API database readiness" 200 GET "$API_URL/api/health/db"
check_status "unauthenticated session" 401 GET "$API_URL/api/auth/session"
check_status "admin login route exists" 422 POST "$API_URL/api/auth/admin/login" '{}'
check_status "generic password reset request" 202 POST "$API_URL/api/auth/admin/request-password-reset" '{"email":"ooro-smoke-invalid@example.invalid"}'
check_status "invalid payment webhook rejected" 400 POST "$API_URL/api/webhooks/razorpay" '{"event":"smoke.invalid"}'

if [[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_PASSWORD:-}" ]]; then
  login_status="$(curl -sS --max-time 20 -H 'content-type: application/json' --data "$(jq -cn --arg email "$ADMIN_EMAIL" --arg password "$ADMIN_PASSWORD" '{email:$email,password:$password}')" -o "$TMP_DIR/login" -w '%{http_code}' "$API_URL/api/auth/admin/login")" || login_status="000"
  if [[ "$login_status" != "200" ]]; then
    printf 'FAIL %-32s expected=200 actual=%s\n' "admin login" "$login_status"
    fail=$((fail + 1))
  else
    printf 'PASS %-32s %s\n' "admin login" "$login_status"
    pass=$((pass + 1))
    access_token="$(jq -er '.data.accessToken' "$TMP_DIR/login")"
    refresh_token="$(jq -er '.data.refreshToken' "$TMP_DIR/login")"
    session_status="$(curl -sS --max-time 20 -H "authorization: Bearer $access_token" -o "$TMP_DIR/session" -w '%{http_code}' "$API_URL/api/auth/session")" || session_status="000"
    [[ "$session_status" == "200" ]] || { printf 'FAIL %-32s expected=200 actual=%s\n' "authenticated session" "$session_status"; fail=$((fail + 1)); }
    if [[ "$session_status" == "200" ]]; then
      pass=$((pass + 1))
    fi
    logout_status="$(curl -sS --max-time 20 -H 'content-type: application/json' --data "$(jq -cn --arg token "$refresh_token" '{refreshToken:$token}')" -o "$TMP_DIR/logout" -w '%{http_code}' "$API_URL/api/auth/logout")" || logout_status="000"
    [[ "$logout_status" == "200" ]] || { printf 'FAIL %-32s expected=200 actual=%s\n' "logout" "$logout_status"; fail=$((fail + 1)); }
    if [[ "$logout_status" == "200" ]]; then pass=$((pass + 1)); printf 'PASS %-32s %s\n' "logout" "$logout_status"; fi
    refresh_status="$(curl -sS --max-time 20 -H 'content-type: application/json' --data "$(jq -cn --arg token "$refresh_token" '{refreshToken:$token}')" -o "$TMP_DIR/refresh" -w '%{http_code}' "$API_URL/api/auth/refresh")" || refresh_status="000"
    [[ "$refresh_status" == "401" ]] || { printf 'FAIL %-32s expected=401 actual=%s\n' "revoked refresh" "$refresh_status"; fail=$((fail + 1)); }
    if [[ "$refresh_status" == "401" ]]; then pass=$((pass + 1)); printf 'PASS %-32s %s\n' "revoked refresh" "$refresh_status"; fi
  fi
else
  skip=$((skip + 1)); printf 'SKIP %-32s credentials not provided\n' "credentialed admin workflow"
  if [[ "$REQUIRE_ADMIN" == "true" ]]; then
    fail=$((fail + 1)); printf 'FAIL %-32s credentials required\n' "credentialed admin workflow"
  fi
fi

printf '\nSummary: pass=%s fail=%s skip=%s\n' "$pass" "$fail" "$skip"
[[ "$fail" -eq 0 ]]
