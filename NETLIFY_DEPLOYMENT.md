# OORO Netlify deployment

OORO is a Next.js App Router application at the repository root. It is part of a pnpm workspace, but the web frontend is the root package; `apps/api` is a separate backend service and is not the Netlify site.

## Netlify dashboard settings

```text
Base directory: .
Package directory: leave empty
Build command: pnpm build
Publish directory: .next
Functions directory: leave empty
Node version: 20
```

The checked-in `netlify.toml` installs `@netlify/plugin-nextjs`. This is required so Netlify serves Next.js App Router pages, middleware, and `/api/*` route handlers correctly. Do not add a Vite-style `/* -> /index.html` redirect: this is not a static SPA and there is no root `index.html` to publish.

## Environment variables

Copy `.env.example` into the Netlify environment settings:

- `NEXT_PUBLIC_SITE_URL`: production site URL, used for canonical metadata and sitemap URLs. Set this to the real deployed domain.
- `WAITLIST_WEBHOOK_URL`: optional HTTPS endpoint for waitlist persistence. Leave empty for local/demo browser persistence.
- `NEXT_PUBLIC_DEVICE_DATA_SOURCE`: optional; do not set it in production unless mock admin data is intentional.

The variables used by `apps/api` (`DATABASE_URL`, `JWT_SECRET`, OTP and token settings) belong to that separate API deployment, not this Netlify frontend build.

## Deploy and verify

1. Push the repository to GitHub and connect it to Netlify.
2. Select the repository root as the base directory and use the settings above.
3. Add `NEXT_PUBLIC_SITE_URL` in Netlify before the first deploy.
4. Confirm the deploy log ends with a successful `pnpm build` and the publish directory is `.next`.
5. Open `/`, `/login`, `/signup`, `/cities` (if added as a standalone route), and `/network` (if added as a standalone route). Refresh each route directly.
6. Confirm protected URLs such as `/dashboard` redirect to `/login` when no session cookie exists.

The Next.js Netlify plugin handles route rendering and asset delivery, so direct refreshes do not require a catch-all static redirect. If a future static route is added, implement it as a Next.js route rather than adding an `index.html` fallback.

## Local production check

```bash
pnpm install
pnpm build
pnpm start
```

The production server should be checked at `http://localhost:3000`. The build output is `.next`; it contains the Next.js server/build artifacts consumed by the Netlify plugin.
