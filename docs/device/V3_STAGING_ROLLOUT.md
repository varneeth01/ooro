# Screen manifest V3 staging rollout checklist

This is an operator procedure only. It does not authorize or perform a staging/production migration. V3 requires migration `20261105090000_sponsored_slot_layout_v3` before API/admin code reads or writes `Campaign.deliverySlot`, `DisplayZoneConfig.layoutContractVersion`, or `ProofOfPlay.slot`.

## Preflight and backup

1. Confirm the target is staging and obtain the deployment/database owner’s approval. Use the approved secret manager or deployment environment to provide `DATABASE_URL`; do not paste it into shell history or CI logs.
2. Check migration state from the exact API release candidate:

   ```bash
   pnpm --filter @ooro/api exec prisma migrate status
   ```

3. Review all pending migrations, not only the V3 migration. Confirm the deployed database schema and candidate Prisma schema are aligned with the release plan.
4. Make a custom-format backup on the authorized staging operator host, keeping the connection string in the shell environment:

   ```bash
   umask 077
   pg_dump --format=custom --no-owner --file="$BACKUP_FILE" "$DATABASE_URL"
   pg_restore --list "$BACKUP_FILE" >/dev/null
   ```

5. Restore that backup to an isolated disposable database and verify representative campaign, schedule, allocation, display configuration, creative and proof row counts. Do not use a live staging database as a restore target for this rehearsal.

## Apply and deploy

6. With explicit staging approval, apply the repository’s reviewed additive migrations from the release commit:

   ```bash
   pnpm --filter @ooro/api exec prisma migrate deploy
   pnpm --filter @ooro/api exec prisma migrate status
   ```

7. Deploy the matching API and admin commit only after migration status is clean. Keep V3 opt-in: existing display zone records default to contract V2. Do not change a display to V3 as part of migration deployment.
8. Verify `/api/health`, API startup logs, and Prisma migration status. For an authorized test display, set layout contract V3 through the existing admin screen-zone workflow; separately assign an explicitly approved static image campaign to the SPONSORED slot and publish it through the normal scheduler/inventory approval path.
9. Use authenticated manifest diagnostics and the device manifest response to confirm `layout.contractVersion: 3`, expected layout proportions, no news announcements, and either one eligible `sponsoredItem` or no sponsor. Verify the sponsor’s approved image type, active asset, checksum, schedule and authorization expiry. Do not infer sponsorship from a MAIN campaign.
10. Verify a legacy V1/V2 client receives its legacy geometry and no sponsored item. Omitted proof `slot` remains `MAIN`; V3 sponsored proof events must carry `SPONSORED` and match the campaign slot.

## Recovery

The migration is additive and does not remove existing rows. A schema rollback that drops the three new columns discards any V3 layout choice, sponsored-slot assignment, and sponsor proof attribution recorded after rollout. Before any rollback, stop V3 writes and export those values. Prefer a forward corrective migration after V3 data exists. Restore a backup only under the database owner’s incident procedure with a reviewed downtime/data-loss plan; never overwrite staging from a backup casually. Keep V3 disabled until API, admin, and compatible Screen Player releases are all available.
