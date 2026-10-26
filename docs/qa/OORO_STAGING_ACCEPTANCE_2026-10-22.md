# OORO Staging Acceptance — 2026-10-22

## Scope and evidence

Approved release: `5c232b9a176abea4adf50e3bf550e5330dd2d074`.

Checks were run against `https://staging.theooro.com` and `https://api-staging.theooro.com` on 2026-10-22. No production infrastructure, database migration, customer record, physical Android device, credential, reset email or real campaign was modified. The original local DeviceOS worktree was preserved.

The public staging API is reachable and appears to contain the updated authentication release. The public website is still serving an older revision; this prevents full staging acceptance.

## Infrastructure and deployment

| Test | Result | Evidence |
|---|---|---|
| Website HTTPS availability | PASS | `GET https://staging.theooro.com/` → HTTP 200 |
| Main API liveness | PASS | `GET /health` → HTTP 200, `status: ok` |
| API health alias | PASS | `GET /api/health` → HTTP 200, `status: ok` |
| Database readiness | PASS | `GET /api/health/db` → HTTP 200, `database: ok` |
| TLS | PASS | Let’s Encrypt certificate for `theooro.com`; valid 2026-10-19 through 2027-01-17 |
| Security headers | PASS | HSTS, CSP, X-Content-Type-Options, X-Frame-Options, referrer policy present |
| CORS approved origin | PASS | Staging website origin is returned for API requests |
| CORS unapproved origin | PASS | No `Access-Control-Allow-Origin` returned for `https://evil.example` |
| Deployed commit identity | BLOCKED | No public commit/version endpoint; Coolify access was unavailable |
| Prisma migration status | BLOCKED | Database health passed, but no staging `DATABASE_URL` or read-only Prisma access was available |
| Reported 34 migrations | NOT VERIFIED | The repository contains 34 checked-in migration directories; this does not prove staging has 34 applied and zero pending |
| Runtime environment inventory | BLOCKED | Coolify access unavailable; values were not requested or exposed |
| Image-layer secret audit | PASS for approved build | `.dockerignore` excludes `.env`/key files; approved Docker validation used no secret build arguments |

## Credential-free smoke harness

Command:

```bash
BASE_URL=https://staging.theooro.com \
API_URL=https://api-staging.theooro.com \
scripts/release/staging-smoke.sh
```

Result: **7 passed, 0 failed, 1 skipped**.

Passed: website admin-login page status, API liveness, API health alias, database readiness, unauthenticated session rejection, admin-login route existence, and generic password-reset response. The credentialed workflow was skipped because no operator-approved staging admin credentials were supplied.

## Admin authentication

| Test | Result | Evidence |
|---|---|---|
| Admin login endpoint exists | PASS | `POST /api/auth/admin/login` with empty JSON → HTTP 422 |
| Generic reset endpoint exists | PASS | Invalid reset request → HTTP 202 from smoke harness |
| Unauthenticated session rejected | PASS | `GET /api/auth/session` → HTTP 401 |
| Valid email/password login | BLOCKED | Requires an existing authorized staging admin account and password |
| Invalid password behavior | BLOCKED | Requires an authorized test account; no brute-force attempts made |
| Rate limiting/lockout | NOT TESTED | No credentialed test account and no destructive login attempt sequence run |
| Password reset delivery/expiry | BLOCKED | Requires approved test mailbox and reset workflow authorization |
| Session creation/logout/revocation | BLOCKED | Requires valid staging credentials |
| CSRF/origin behavior | PARTIAL PASS | CORS origin behavior verified; state-changing authenticated workflow not run |
| Role boundaries | BLOCKED | Requires seeded role-specific test accounts |

The staging website admin page is stale: its HTML contains `phone`, `OTP`, and `password` markers. This conflicts with the approved email/password release and is a launch-blocking deployment mismatch.

## Website integration

| Test | Result | Evidence |
|---|---|---|
| Website home page | PASS | HTTP 200 |
| Admin login page reachable | PASS | HTTP 200 |
| Admin page uses email/password only | FAIL | Staging HTML still contains legacy phone/OTP markers |
| Login reaches updated API | BLOCKED | Website revision is stale; authenticated credentials unavailable |
| Admin dashboard/screens/device health/campaigns | BLOCKED | Requires updated website deployment and authorized login |
| Responsive/mobile behavior | NOT TESTED | Browser/device automation was not available in this run |
| Website error handling/logout | BLOCKED | Requires updated website and authenticated session |

## Advertising workflow

Campaign creation, creative upload, targeting, scheduling, operational approval, assignment, manifest generation, proof-of-play, reporting, pause/resume and audit logging were **BLOCKED** for live staging acceptance. These require approved disposable staging identities, authenticated roles and permission to create/write test records.

Local regression tests covering campaign validation, scheduling, inventory, proof-of-play and authorization passed as part of the API suite, but local tests are not staging acceptance evidence.

## Payment retirement

| Endpoint group | Result | Evidence |
|---|---|---|
| API public campaign order creation | PASS | HTTP 410, `PAYMENT_PROCESSING_RETIRED` |
| API campaign order verification | PASS | HTTP 410 |
| API Razorpay webhook | PASS | HTTP 410 |
| Website recharge/checkout routes | FAIL | Staging website is stale: returned 401 without auth rather than the updated 410 response |
| Website public order routes | FAIL | Staging website returned 422/400, proving old payment handlers are deployed |
| Historical financial record preservation | NOT VERIFIED LIVE | No database query access; repository retains historical models and fields |
| Campaign activation without payment | BLOCKED | Requires updated website, authorized test roles and disposable write records |

The API-side retirement is active. The website-side retirement is not deployed to staging.

## Security and stability

| Test | Result |
|---|---|
| HTTPS/TLS | PASS |
| API security headers | PASS |
| Approved CORS origin | PASS |
| Unapproved CORS origin | PASS |
| Unauthenticated admin/session rejection | PASS |
| Authentication bypass attempts | BLOCKED |
| RBAC and cross-tenant isolation | BLOCKED live; local regression coverage PASS |
| Input validation | PASS for empty admin auth probes; broader live workflow BLOCKED |
| Sensitive error leakage | PASS for sampled health/auth responses; full authenticated coverage BLOCKED |
| Database failure handling | NOT TESTED; would require controlled infrastructure fault injection |
| File-upload restrictions | BLOCKED live; local code/tests only |
| Physical Android compatibility | NOT TESTED by instruction |

## Local regression results

Run from an isolated worktree at the approved release:

- Prisma validation: **PASS**
- TypeScript typecheck: **PASS**
- Lint: **PASS**, 0 errors and 20 existing warnings
- API tests: **PASS**, 92 total / 88 passed / 0 failed / 4 skipped
- API and Next.js production build: **PASS**
- Native Argon2id and Node.js 22 container build: **PASS** in the prior release validation

The four skipped API tests are database/DeviceOS integration tests requiring a disposable PostgreSQL database or APK/device fixtures.

## Findings

### Critical

1. **Staging website is running an outdated release.** `/admin/login` still exposes phone/OTP markers and website payment endpoints are not retired. Do not use staging as production acceptance evidence until the website is redeployed from the approved commit.

### High

1. **Staging Prisma migration state is not independently verified.** Health `database: ok` does not prove 34 migrations applied and zero pending.
2. **Authenticated admin, RBAC, password reset and campaign acceptance are blocked** without an approved staging test account/mailbox and disposable test-record authorization.
3. **Deployed commit identity is not externally verifiable** without Coolify access or a public build/version marker.

### Medium

1. Browser responsive testing and controlled failure-injection tests were not run.
2. The API exposes `X-Powered-By`-equivalent framework metadata only if introduced by upstream infrastructure; no direct sensitive data was observed. Recheck after the correct website/API deployment.

### Low

1. Local lint retains 20 existing warnings.
2. Physical Android tests remain unperformed.

## Exact next actions

1. In Coolify, deploy both the Main API and Next.js website from commit `5c232b9a176abea4adf50e3bf550e5330dd2d074`; verify the deployment logs and record the immutable image digest.
2. Confirm the website build uses the repository root and the API uses the corrected Nixpacks pnpm bootstrap.
3. With an approved read-only staging database connection, run `prisma migrate status` and record `34 applied, 0 pending`; do not run migrations from this QA report.
4. Provide an existing authorized staging admin test account and protected mailbox. Do not create a Super Admin automatically.
5. Rerun the smoke harness with `SMOKE_REQUIRE_ADMIN=true`, then run role-boundary and authenticated campaign tests using disposable records only.
6. Recheck every website payment route returns HTTP 410 and verify no payment event is acknowledged or processed.
7. Only after all mandatory staging checks pass should production launch approval be considered.

## Final decision

**STAGING READY: NO**

**PRODUCTION READY: NO**

Primary blocker: the staging website is still on an older deployment. Secondary blockers are unverified migration state and unavailable authorized credentials for authenticated acceptance.

## Post-frontend-deployment recheck — 2026-10-23

The requested post-frontend-deployment verification was rerun against both staging targets. The frontend deployment could not be confirmed; public behavior is unchanged from the previous report.

| Test | Result | Evidence |
|---|---|---|
| Website home | PASS | `GET https://staging.theooro.com/` → HTTP 200 |
| Website admin login is email/password | FAIL | HTML contains “Authenticate with your OORO admin phone and one-time password”, “Admin phone”, and “Send admin OTP” |
| Website submits to updated admin API | BLOCKED | The deployed page is the legacy phone/OTP implementation |
| API admin login route | PASS | Empty `POST /api/auth/admin/login` → HTTP 422 validation response |
| API password reset route | PASS | Empty `POST /api/auth/admin/request-password-reset` → HTTP 422 validation response |
| API unauthenticated session | PASS | `GET /api/auth/session` → HTTP 401 |
| API payment creation | PASS | `POST /api/public/campaign-orders` → HTTP 410 `PAYMENT_PROCESSING_RETIRED` |
| API payment verification | PASS | `POST /api/public/campaign-orders/verify` → HTTP 410 |
| API payment webhook | PASS | `POST /api/webhooks/razorpay` → HTTP 410 |
| Website payment creation | FAIL | `POST /api/public/campaign-orders` → HTTP 422 legacy validation response |
| Website payment verification | FAIL | `POST /api/public/campaign-orders/verify` → HTTP 400 `INVALID_PAYMENT_SIGNATURE` |
| Website checkout/recharge | FAIL | Checkout and recharge routes → HTTP 401 legacy auth/payment messages |
| API health | PASS | `/health`, `/api/health`, `/api/health/db` each → HTTP 200 |
| Browser console/network inspection | NOT TESTED | Browser-control surface was unavailable; curl evidence above was collected instead |
| Exact deployed API commit | BLOCKED | No public commit/build identifier; Coolify access unavailable |
| Prisma migrations | BLOCKED | No authorized read-only staging database connection was available; no migration command was run |
| Authenticated admin workflow | BLOCKED | No approved staging credentials/mailbox supplied |
| Campaign workflow | NOT TESTED | No authorized disposable staging records or credentials supplied |

Current decision remains:

**STAGING READY: NO**

**PRODUCTION READY: NO**

Remaining launch blockers are: deploy the website from approved release `5c232b9a176abea4adf50e3bf550e5330dd2d074`; independently verify the deployed API and website commit identities; verify all 34 Prisma migrations are applied with zero pending using authorized read-only access; and run credentialed admin/RBAC/campaign acceptance with approved disposable test data.

## Version mismatch investigation — 2026-10-23

### Approved source evidence

The approved commit contains `app/admin/login/page.tsx` with the text “Sign in with your OORO admin email and password.” It renders `components/auth/admin-auth-form.tsx`, which has an email input, a password input, and submits JSON to `/api/auth/admin/login`. The approved source contains no phone/OTP implementation under the admin login route.

### Live website evidence

`GET https://staging.theooro.com/admin/login` returned HTTP 200 but rendered:

- “Authenticate with your OORO admin phone and one-time password.”
- “Admin phone”
- “Send admin OTP”

The page references `_next/static/chunks/app/admin/login/page-434ac1906457d4ff.js`. That JavaScript asset also contains `phone` and `OTP` markers. The live login HTML SHA-256 was:

```text
891bb89019e9dd8ab8cf5bbdda272014bb94516cb5063f510b69ba2bd6865738
```

The login asset SHA-256 was:

```text
7049e949c14ca908604a286ae722dba2678574c09a011a018d804ea9716a7a52
```

Adding `?cachebust=20261023` and `?__nextDefaultLocale=en` produced the same HTML hash and legacy markers. This makes a browser-local cache unlikely.

### staging.theooro.com versus deploy.theooro.com

Both hosts returned identical `/` and `/admin/login` body hashes, identical legacy login markers, identical Next.js asset paths and identical asset hashes. Both used `x-nextjs-cache: HIT`, `cache-control: s-maxage=31536000` for the HTML, `x-powered-by: Next.js`, and Cloudflare. DNS resolution returned the same Cloudflare address set. This is consistent with both hostnames routing to the same old website deployment/origin; it is not evidence of two independently deployed releases.

### API comparison

The API shows the newer release behavior:

- Empty `POST /api/auth/admin/login` → HTTP 422 validation response.
- `GET /api/auth/session` → HTTP 401.
- `POST /api/public/campaign-orders` → HTTP 410 `PAYMENT_PROCESSING_RETIRED`.
- `POST /api/public/campaign-orders/verify` → HTTP 410.
- `POST /api/webhooks/razorpay` → HTTP 410.

No public API response exposes a commit SHA or image digest, so the exact API commit remains independently unverified.

### Server Reference ID / malformed request result

The API’s normal invalid JSON request (`POST /api/auth/admin/login` with body `{`) returned HTTP 500 with a generic `INTERNAL_ERROR` and a request ID. The same endpoint with valid empty JSON returned HTTP 422 with a validation error. Therefore a “Server Reference ID” shown for this case is a correlation identifier attached to a malformed-request server error, not proof of a version mismatch. The malformed JSON → 500 behavior is reproducible and should be hardened separately so parse failures return a controlled 400/422 response.

### Exact Coolify actions

1. In Coolify, open the website application and confirm the source repository, branch `main`, and commit/build revision are `5c232b9a176abea4adf50e3bf550e5330dd2d074`.
2. Trigger a new build/deploy for the website application; do not rely on restart-only or an API-only deployment.
3. Confirm the build log contains the approved commit and the Next.js build completes successfully.
4. Confirm the website domain `staging.theooro.com` is attached to this newly deployed application, not an older Netlify/Coolify service or preview deployment.
5. If Coolify uses an external CDN/proxy, purge only the website deployment’s cached HTML/static assets after the new deployment is healthy. Do not purge unrelated sites or databases.
6. Verify `/admin/login` contains `Admin email`, `Password`, and `Sign in`, and that its loaded asset hashes differ from the legacy `page-434ac1906457d4ff.js` asset.
7. Repeat the payment-route checks and the authenticated staging acceptance suite before production consideration.
