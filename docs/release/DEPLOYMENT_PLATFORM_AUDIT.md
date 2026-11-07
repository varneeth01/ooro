# Frontend deployment platform audit

**Canonical deployment target:** Coolify on the Bluehost VPS, as supplied for this sprint. The web runtime is the Next.js app built by `Dockerfile.web`; the API is a separate Coolify service using `Dockerfile.api`/`nixpacks.toml` and `apps/api`.

## Netlify inventory

The repository contained a Netlify Next.js plugin configuration, API Lambda wrapper, and payment redirects. They are not needed by the documented Coolify topology:

- `netlify/functions/api.mjs` wrapped the Fastify API for AWS Lambda. Coolify runs the API as its own service instead.
- `netlify/payments.ts` returned a static `410 PAYMENT_PROCESSING_RETIRED`; it did not create orders or process webhooks.
- API `POST /api/public/campaign-orders`, `/api/public/campaign-orders/verify`, and `/api/webhooks/razorpay` are short-circuited to the same 410 response in the Fastify server. This change keeps that response available through Next.js routes for a same-origin web deployment.
- `GET /api/public/campaign-packages` is still served by the Next.js route. It lists planning packages; it does not collect payment.
- Historical order/receipt reads and campaign request/forecast flows are not changed.

The retired Netlify function, redirects, generated build step, and configuration were removed. This does **not** unlink a Netlify site from GitHub or change DNS. A prior PR had a Netlify deploy-preview status, so the GitHub integration may still be attached even though Coolify is the intended runtime. No external deployment settings were changed by this PR.

## Coolify release checks

Before removing the external Netlify link, confirm the current reviewed commit is deployed in Coolify staging, then production through the normal release process. Verify the public homepage, `/advertise`, `/how-it-works`, `/coverage`, `/admin/login`, same-origin API routes, `https://api-staging.theooro.com/health`, TLS, and logs. Check host DNS and the Coolify deployment record; do not infer the provider from repository files alone.

Domain aliases previously redirected to the canonical `https://theooro.com` host in `netlify.toml`. Equivalent host-based redirects now live in `next.config.ts` for `ooro.media`, `www.ooro.media`, `ooro.network`, `www.ooro.network`, `ooro.digital`, `www.ooro.digital`, `oroo.tech`, and `www.oroo.tech`.

## Disconnect Netlify from GitHub

Perform these steps only after the Coolify deployment and DNS checks above pass:

1. In Netlify, open the OORO site and go to **Project configuration → Developer settings → Continuous deployment → Repository → Manage repository → Unlink the current repository**. Netlify notes this disables continuous deployment and removes that site's deploy key and build hooks. Preserve any other Netlify site using the same GitHub App.
2. In GitHub, open account **Settings → Applications → Installed GitHub Apps → Netlify → Configure**. Remove access to `varneeth01/ooro` if no other Netlify site needs it. Uninstall the app only if the account has no other Netlify-linked repositories.
3. In repository branch rules/rulesets, inspect required checks. Remove a Netlify status context only after a replacement Coolify build/deploy check is required and passing. Do not delete unrelated checks.
4. Confirm a new test PR no longer receives Netlify preview checks and that Coolify's documented deployment path still builds the exact reviewed commit.

Netlify's current instructions: [unlink a Git repository](https://docs.netlify.com/build/git-workflows/repo-permissions-linking/#unlink-a-git-repository). GitHub's current instructions: [review and modify installed GitHub Apps](https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps).
