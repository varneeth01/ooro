FROM node:20-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN corepack enable
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/deviceos-api/package.json apps/deviceos-api/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile

COPY apps/api/prisma apps/api/prisma
COPY apps/deviceos-api apps/deviceos-api
COPY packages packages
RUN pnpm --filter @ooro/deviceos-api build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN corepack enable
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 libssl3 android-sdk-build-tools && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./

EXPOSE 8081
CMD ["pnpm", "--filter", "@ooro/deviceos-api", "start"]
