# Local backend development

1. Start PostgreSQL and Redis with `docker compose -f apps/api/docker-compose.yml up -d`.
2. Configure `DATABASE_URL`, `JWT_SECRET`, and `DEV_MOCK_OTP_ENABLED=true` only for local development.
3. Apply migrations with `pnpm --filter @ooro/api prisma:migrate`.
4. Seed the demo driver/admin with `pnpm --filter @ooro/api prisma:seed`.
5. Start the API with `pnpm --filter @ooro/api dev`.

The fixed OTP is available only when the development flag is enabled and `NODE_ENV` is not production. Pairing codes are generated server-side using cryptographic random bytes, hashed at rest, expire after ten minutes, and are single-use.
