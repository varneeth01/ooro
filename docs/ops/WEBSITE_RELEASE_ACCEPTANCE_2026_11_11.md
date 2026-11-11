# OORO website release acceptance — 11 November 2026

Scope: public website and advertiser web experience. This is a **release checklist**, not proof that production is ready.

## 1. Coolify deployment (authorized operator only)

- Project `ooro`, environment `production`, web service `ooro-web`, GitHub `varneeth01/ooro:main`. The API may be a separately deployed service.
- Take a configuration/log snapshot and confirm a safe rollback image before deployment; never print secrets or edit production DB as part of a web-only release.
- Verify web image builds successfully and note **running commit SHA**, not merely GitHub HEAD. Redeploy `main` only after CI green. Verify canonical production hosts `https://theooro.com` and `https://www.theooro.com`.
- If the build fails during image export, diagnose Coolify build logs and host memory/disk/timeouts; do not perform indiscriminate Docker prune.
- Do not change Android Screen Player, DeviceOS, payments data, or production migrations to deploy the website.

## 2. Release smoke: anonymous and authorized

- 200: `/`, `/advertise`, `/login`, `/admin/login`, `/contact`, `/careers`, `/robots.txt`, `/sitemap.xml`, `/digital-advertising-bengaluru`.
- Anonymous `/admin` and `/admin/proof-of-play` should redirect safely within public host (or fail closed as documented when auth backend is down), never 500 or redirect to localhost / 0.0.0.0.
- With an authorized test account: login/logout, session refresh/expiration, Super Admin Campaigns, Proof of Play, Layout Studio, ads upload (PNG/MP4), schedule statuses, access control; test denied users.
- Campaign planner: Bengaluru defaults to current IST date; unrecognized location cannot silently use Bengaluru GPS; legitimate geocoder selection and known city work; past date/invalid radius rejected.
- Public campaign POST: unauthenticated 401; unsupported roles 403; unverified org 403; `SCHEDULED` request 422; valid advertiser `DRAFT` accepted, stored status DRAFT. Avoid sending these tests to live production unless using test entities and authorized cleanup.
- Payment: **test mode only** for checkout, provider signature/webhook verification, idempotent retries, reservation TTL and refund/cancellation flows. No real payments or production test campaigns without an approved operator plan.
- Compare ad reports and Proof of Play against actual recorded plays, not claimed reach. Verify data isolation between customers.

## 3. Local SEO and performance

- Validate page titles, one H1, descriptions, canonical, robots directives, breadcrumbs, and links on priority Bengaluru pages.
- Verify `/digital-advertising-bengaluru` is accessible, original, indexable and linked from homepage/footer.
- In property-owner Google Search Console, inspect indexing, sitemap and query/page pairs for **digital advertising bengaluru**, **digital ads in bengaluru**, **auto rickshaw advertising bangalore**, **advertising inside autos bengaluru**. Use a 28-day baseline of impressions, clicks, CTR and average position, compare after 28+ days. Submit updated sitemap / request indexing after deploy. Do not promise rankings or generate city-doorway pages.
- Use field-authentic imagery and true client case studies only with rights/permission. Seek quality local citations/backlinks through legitimate partnerships.
- Measure Lighthouse mobile LCP/CLS/INP, CWV and accessibility after deploy. Don't suppress harmless preload warnings without performance evidence.
- Review canonical consistency and avoid duplicated competing Bengaluru pages.

## 4. Legal and operational ownership

- Privacy and Terms remain drafts/noindex until company/legal owner signs off entity, data flows, retention, privacy request process, payment terms, refunds, dispute procedure and consent.
- Define and verify authorized operations email, advertiser support SLA and escalation routes.
- Scheduled GitHub Actions website availability job checks public pages and anonymous admin redirect every 30 minutes and on manual dispatch. It **does not send external alerts** until on-call notifications are configured by GitHub user/organization or an authorized incident integration.
- Track live failures and evidence in GitHub issue #82 and Super Admin issue #77. Close only when verified, with build SHA and screenshots/log excerpts that contain no secrets.

## Current known blockers (2026-11-11)

- Independent anonymous external fetch of `/admin` and `/admin/proof-of-play` returned HTTP 500; the root cause is unverified without proxy/Next logs and actual status/Location chain.
- `/login` public HTML appeared to use pre-#81 legal copy, suggesting production build drift.
- Coolify dashboard secure domain was not accessible through external probe; no authenticated release permissions available in this audit.
- No direct account-owner Search Console impression/position report was accessible in this audit.

Mark each release gate **verified only on evidence**, not on merged code or a passing repository CI alone.
