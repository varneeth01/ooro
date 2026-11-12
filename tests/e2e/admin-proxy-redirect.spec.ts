import { expect, test } from "@playwright/test";

test("unauthenticated admin redirects use a valid public same-origin URL", async ({ request, baseURL }) => {
  const origin = new URL(baseURL ?? "http://127.0.0.1:3000").origin;
  const response = await request.get("/admin/proof-of-play?skip=0", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const location = new URL(response.headers()["location"]);
  expect(location.origin).toBe(origin);
  expect(location.pathname).toBe("/admin/login");
  expect(location.searchParams.get("next")).toBe("/admin/proof-of-play?skip=0");
  expect(location.href).not.toMatch(/(?:0\.0\.0\.0|localhost|127\.0\.0\.1):8080/i);
});

test("other protected page redirects stay on the request origin", async ({ request, baseURL }) => {
  const response = await request.get("/dashboard", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const location = new URL(response.headers()["location"]);
  expect(location.origin).toBe(new URL(baseURL ?? "http://127.0.0.1:3000").origin);
  expect(location.pathname).toBe("/login");
  expect(location.searchParams.get("next")).toBe("/dashboard");
});
