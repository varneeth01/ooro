import { expect, test } from "@playwright/test";

test("unauthenticated admin redirects preserve the browser origin", async ({ request, baseURL }) => {
  const origin = new URL(baseURL ?? "http://127.0.0.1:3000").origin;
  const response = await request.get("/admin/proof-of-play?skip=0", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const location = response.headers()["location"];
  expect(location).toMatch(/^\/admin\/login\?next=/);
  expect(location).not.toMatch(/(?:0\.0\.0\.0|localhost|127\.0\.0\.1):8080/i);
  expect(new URL(location, origin).origin).toBe(origin);
  expect(new URL(location, origin).searchParams.get("next")).toBe("/admin/proof-of-play?skip=0");
});

test("other protected page redirects also stay relative", async ({ request }) => {
  const response = await request.get("/dashboard", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toBe("/login?next=%2Fdashboard");
});
