# Admin RBAC Security Remediation — Phase 1

## Permission matrix

| Permission | SUPER_ADMIN | ADMIN | OPERATIONS | FINANCE | SUPPORT |
|---|---:|---:|---:|---:|---:|
| Admin read access | Yes | Yes | Yes | Yes | Yes |
| Campaign read | Yes | Yes | Yes | Yes | Yes |
| Campaign create/edit/approve/schedule/activate | Yes | Yes | Yes | No | No |
| Creative and device writes | Yes | Yes | Yes | No | No |
| Network configuration writes | Yes | Yes | Yes | No | No |
| Financial record read | Yes | Yes | Yes | Yes | No |
| Admin account management | Reserved for Phase 2 | Reserved for Phase 2 | No | No | No |

The matrix is defined in `apps/api/src/domain/admin-auth.ts` and is used by Fastify and the Next.js server-side admin guards. Frontend visibility is not an authorization boundary.

## Security changes

- Campaign creation, editing and creative writes require explicit permissions.
- Finance and Support cannot create, edit, approve, schedule or activate campaigns.
- Next.js direct Prisma write routes require `ADMIN_WRITE` or the relevant campaign/device permission.
- Device pairing now requires `DEVICE_WRITE`; driver pairing remains unchanged.
- Password setup/reset consumption uses a conditional transactional update so only one concurrent request can consume a token.
- Integration coverage now includes lockout threshold, reset expiry, concurrent reuse and session revocation. Database-backed cases run only when `OORO_ADMIN_AUTH_INTEGRATION_TESTS=true` and `DATABASE_URL` targets `ooro_test`.

## Validation

- API tests: 89 passed, 0 failed, 4 skipped because PostgreSQL integration infrastructure was not enabled.
- API build: passed.
- Next.js production build: passed.
- TypeScript: passed.
- Lint: passed with existing warnings only.
- Prisma validation: passed against a disposable localhost-style URL; no migration was run.

Phase 2 remains required for Super Admin invitations, role changes, suspension, session revocation on suspension, last-Super-Admin protection and management audit events.
