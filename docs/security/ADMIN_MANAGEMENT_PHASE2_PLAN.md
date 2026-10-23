# OORO Phase 2 — invitation and admin lifecycle PR (draft)

## Scope implemented in this branch
- Dedicated AdminInvitation table with SHA-256 hashed single-use tokens and expiry/revocation/acceptance timestamps; additive PostgreSQL migration.
- Super Admin-only invitation creation/listing/revocation, administrator directory, role/status updates and session revocation.
- Atomic invitation acceptance using a conditional database claim transaction; Argon2id passwords; existing unique real phone constraint preserved at acceptance.
- Last active Super Admin protection uses a PostgreSQL transaction-scoped advisory lock across concurrent updates.
- Changes to role/status revoke refresh sessions and require live role/status checks.
- Audit events for invitation changes, acceptance, role/status updates and session revocation.
- Next.js authenticated backend proxies and Super Admin /admin/users page; public /admin/accept-invite page.
- No invitation email or accounts have been created.

## Critical release gates — NOT YET VERIFIED
1. Run Prisma generate + validate and apply 35 migrations to a disposable PostgreSQL 16 instance; verify backward compatibility with all 34 existing migrations.
2. Run API TypeScript/build, Next.js TypeScript/build, full unit/lint and integration tests in an isolated checkout.
3. Add HTTP-level negative tests for all five roles, anti-CSRF protections for admin mutations, and unauthorized account listing.
4. Add real disposable DB concurrency tests: invitation accept double-use; last Super Admin concurrent suspend/demote; email/phone uniqueness; session revocation; invite expiration/revocation; provider failures; locked admin access.
5. Verify live access-token invalidation semantics after session revocation (current refresh-session revocation alone may not immediately invalidate previously issued access tokens). Consider session identifier check or short TTL and enforce logout guarantee.
6. Review invitation dispatch failure recovery: email sent only after DB commit; email errors must be safely retryable without leaking tokens or sending privileged invites unexpectedly.
7. Verify frontend /admin/users navigation/authenticated errors and /admin/accept-invite with configured NEXT_PUBLIC_API_URL and CORS.
8. Review rate limits for recipient and actor/IP, auditing privacy, HTML escaping, and service monitoring; avoid token leaks through access logs and referrers.
9. Product/security review: default role, who may invite SUPER_ADMIN, phone-on-acceptance policy, account suspension and support roles.
10. After reviews pass, make PR ready, merge, apply **additive** migration to staging after backup, deploy paired API/web, and run authorized acceptance tests. Production only after separate approval.

## Explicit limitations
This is a code implementation submitted for review, not validated, deployed or production-ready. Existing worktrees, staging/production database, email infrastructure and Android/DeviceOS devices have not been touched. Do not run production migrations automatically.
