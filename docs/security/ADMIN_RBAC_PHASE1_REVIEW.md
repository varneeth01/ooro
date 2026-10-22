# Phase 1 admin security remediation — review in progress

## Implemented on this branch
- Centralized explicit permission mapping for five canonical admin roles.
- Added Next campaign create/update guards before mutations and explicit approval authorization.
- Synced frontend AdminRole union with the backend.
- Used an atomic conditional update inside a Prisma transaction for password setup/reset token use. Revokes sessions in the same transaction.
- Added positive/negative unit coverage for canonical campaign permission decisions.

## Not yet verified / release blockers
- This GitHub-only change has not been executed through TypeScript, full tests, or actual Docker builds in an authorized local runtime.
- All other Fastify and Next.js admin endpoints need a route-by-route permission audit; existing adminRoles-wide gates are insufficient.
- Review whether OPERATIONS should have campaign create/approve permissions, and ratify the permission matrix with the product owner.
- Add adversarial tests exercising actual HTTP handlers as all five roles, including campaign approval and scheduling.
- Add reset token concurrency/expiry and login lockout integration tests against disposable PostgreSQL.
- Ensure all privileged mutations (screen controls, finance, operational state changes) enforce least privilege on the server.
- Do not merge or deploy this branch until checks and security review pass.
- No database, deployment, account or Android state was modified by this branch.

## Phase 2 proposal
Super Admin-only invitations, invite acceptance, suspension/reenablement, role changes, audit trails, session revocation, and last-Super-Admin protection, with additive migrations if needed.
