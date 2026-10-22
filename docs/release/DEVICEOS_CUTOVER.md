# DeviceOS Cutover

## Current state

The audited `main` branch does not contain `apps/deviceos-api`. DeviceOS API routes, Prisma models and migrations are currently part of the main Fastify API. The DeviceOS Android Agent is a separate Android application, but that does not constitute an independently deployable backend service.

## Required before separation

1. Define an explicit service boundary and ownership for DeviceOS tables and migrations; only one service may own each migration.
2. Preserve `ManagedDevice`, credentials, enrollment state, release history, installation attempts and request receipts.
3. Establish service-to-service admin authorization using short-lived, auditable credentials; do not trust a client-supplied role.
4. Stage the new service against a database clone/snapshot and run dual-read comparison without writing to live devices.
5. Test enrollment, credential rotation/revocation, heartbeat, range downloads, checksum/signature validation, command acknowledgements, idempotency and OTA failure recovery.
6. Canary only approved staging devices, then a small production cohort with a pause/rollback switch.

No production DeviceOS cutover is approved by this audit. The uncommitted `apps/deviceos-api` work in the developer checkout was not copied into this branch or represented as a completed service.

