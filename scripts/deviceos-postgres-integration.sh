#!/usr/bin/env bash
set -euo pipefail

# Runs DeviceOS integration tests against a disposable local PostgreSQL
# container. This script never targets a production-looking database URL.
if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is unavailable; cannot run disposable PostgreSQL tests." >&2
  exit 2
fi

container="ooro-deviceos-postgres-$$"
port=""
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker run --detach --rm --name "$container" \
  -e POSTGRES_USER=ooro \
  -e POSTGRES_PASSWORD=ooro \
  -e POSTGRES_DB=ooro_test \
  -p 127.0.0.1::5432 \
  postgres:16-alpine >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$container" pg_isready -U ooro -d ooro_test >/dev/null 2>&1; then break; fi
  sleep 1
done
if ! docker exec "$container" pg_isready -U ooro -d ooro_test >/dev/null 2>&1; then
  echo "Disposable PostgreSQL did not become ready." >&2
  exit 1
fi

port="$(docker port "$container" 5432/tcp | sed -n 's/.*:\([0-9][0-9]*\)$/\1/p')"
if [[ -z "$port" ]]; then
  echo "Could not determine the disposable PostgreSQL port." >&2
  exit 1
fi

export DATABASE_URL="postgresql://ooro:ooro@127.0.0.1:${port}/ooro_test?schema=public"
export OORO_DEVICEOS_INTEGRATION_TESTS=true
export OORO_DEVICEOS_ALLOW_DISPOSABLE_TCP_DB=true

pnpm --filter @ooro/api exec prisma migrate deploy
pnpm --filter @ooro/api test

if [[ -n "${1:-}" ]]; then
  export DEVICEOS_TEST_APK_PATH="$1"
  export OORO_DEVICEOS_RELEASE_INTEGRATION_TESTS=true
  pnpm --filter @ooro/api test -- src/deviceos-release.integration.test.ts
fi
