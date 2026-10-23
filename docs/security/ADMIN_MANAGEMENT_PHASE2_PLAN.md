# OORO Phase 2 — multi-administrator management

## Dependency and isolation
This work begins from Phase 1 PR #11 head `594c34274e6c4b2c696e03181a92e6ea87bc4532` (not merged at branch creation). The Phase 2 PR should target the Phase 1 branch until Phase 1 merges, then be rebased onto main after approval. **Do not merge Phase 2 ahead of Phase 1.**

## First implemented slice
- A dedicated `admin-users:manage` permission granted exclusively to `SUPER_ADMIN`.
- `GET /api/admin/users` paginated, explicitly scoped to administrator roles, with a strict response field allowlist.
- Unit coverage confirming all other roles are denied.
- No invitations or account mutations have been enabled.

## Critical schema constraint
`User.phone` is currently required and unique. Never assign dummy phone numbers to email-only admins. Evaluate a reviewed additive migration to support nullable phone (check OTP/driver/login flows and existing uniqueness), or use a separate invitation record until proper activation creates a valid User. Existing `TeamInvite` is NOT an admin invitation.

## Planned milestones
1. Add a dedicated `AdminInvitation` model with hashed random token, unique recipient scope, role, expiry, accepted/revoked timestamps, creator, and audit metadata. Use additive migrations only and verify against disposable PostgreSQL.
2. Super Admin-only invite, list, revoke and resend APIs. Rate limit invites, prevent privilege escalation, avoid email/account enumeration, verify the email provider before sending. No passwords in email.
3. Single-use, atomic accept flow with verified email and password. Link expiration and race handling; prevent elevation by editing request payloads. Define account creation compatibility with required phone field.
4. Super Admin-only disable/reactivate, role changes and session revocation. Prevent the last active Super Admin from being disabled/demoted, including concurrent requests; use database locks/transactions as needed.
5. Audited administrative changes (no tokens/passwords/secrets in logs). Rescope session privileges immediately following role change or disablement.
6. Next.js `/admin/users` screen with administrator list, invites, status and actions; backend permissions, not UI visibility, enforce security.
7. HTTP-level five-role tests, negative cases, concurrency, lockout, invitation expiry/replay, mail-provider stub, last-Super-Admin safety and disposable PostgreSQL migrations.
8. Human review, gated merge, matching Coolify staging API/web deployment and authenticated staging acceptance.

## Release status
Foundation only. No schema migration, admin invites, account creation, outgoing emails, staging changes, or deployment have occurred. Full runtime/build validation is still required.
