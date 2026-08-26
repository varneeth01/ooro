# OORO Mobility Backend

`apps/api` is a modular-monolith boundary for the mobility platform. PostgreSQL is authoritative; Redis/BullMQ and push delivery can be added behind the job/command boundaries without changing client contracts.

The trust hierarchy is:

```text
normalized mobility event → server ride candidate → server verification
→ verified ride → display session → actual playback → validated proof
→ server earnings calculation → append-only ledger → payout
```

Driver sessions and display device tokens are separate credential planes. The browser/Android clients report observations; they cannot mark rides verified, set wallet balances, or declare proof valid.

Run locally with `docker compose -f apps/api/docker-compose.yml up -d`, copy `apps/api/.env.example` to `.env`, run `pnpm --filter @ooro/api prisma:migrate`, then `pnpm --filter @ooro/api dev`.
