import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const indexable = ["/", "/about", "/advertise", "/for-brands", "/for-agencies", "/how-it-works", "/methodology", "/bengaluru", "/coverage", "/digital-advertising-bengaluru", "/auto-rickshaw-advertising-bangalore", "/outdoor-advertising-bengaluru", "/small-business-advertising-bangalore", "/auto-advertising-cost-bengaluru", "/guides", "/guides/advertise-business-bengaluru", "/guides/outdoor-advertising-bangalore", "/guides/auto-rickshaw-advertising", "/guides/set-local-advertising-budget", "/guides/dooh-creative-specifications", "/tools/ad-budget-planner", "/field-journal"];

test("indexable landing pages have unique titles, descriptions, canonicals and a single H1", async ({ page }) => {
  const titles = new Set<string>();
  for (const path of indexable) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} status`).toBe(200);
    const title = await page.title();
    expect(title.length, `${path} title`).toBeGreaterThan(12);
    expect(titles.has(title), `duplicate title: ${title}`).toBe(false);
    titles.add(title);
    expect((await page.locator('meta[name="description"]').getAttribute("content"))?.length).toBeGreaterThan(45);
    expect(await page.locator('link[rel="canonical"]').count()).toBe(1);
    expect(await page.locator("h1").count()).toBe(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index/);
  }
});

test("sitemap contains only reachable public content and excludes placeholder legal pages", async ({ page, request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml).toContain("/guides/advertise-business-bengaluru");
  expect(xml).toContain("/tools/ad-budget-planner");
  expect(xml).not.toContain("/privacy");
  expect(xml).not.toContain("/terms");
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].replace(/^https?:\/\/[^/]+/, ""));
  expect(new Set(urls).size).toBe(urls.length);
  for (const url of urls) expect((await page.request.get(url)).status(), url).toBe(200);
});

test("account, private, and placeholder legal pages opt out of indexing", async ({ page }) => {
  for (const path of ["/login", "/signup", "/verification", "/welcome", "/privacy", "/terms", "/network/status"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute("content", /noindex/);
  }
});

test("structured data parses and uses only organization, website, and article entities", async ({ page }) => {
  await page.goto("/");
  const homeData = await page.locator('script[type="application/ld+json"]').allTextContents();
  const root = JSON.parse(homeData[0]);
  expect(root["@graph"].map((node: { [key: string]: unknown }) => node["@type"])).toEqual(["Organization", "WebSite"]);
  await page.goto("/guides/auto-rickshaw-advertising");
  const articleData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(articleData.map(raw => JSON.parse(raw)["@type"])).toContain("Article");
});

test("budget planner updates the arithmetic and labels its limits", async ({ page }) => {
  await page.goto("/tools/ad-budget-planner");
  await page.getByLabel("Total budget (₹)").fill("14000");
  await page.getByLabel("Duration (days)").fill("7");
  await expect(page.getByText(/₹2,000 per day across 7 days/)).toBeVisible();
  await expect(page.getByText(/does not estimate OORO inventory, impressions, reach/)).toBeVisible();
});

test("public media returns successfully and video does not preload before play", async ({ page, request }) => {
  for (const asset of ["/field/ooro-bengaluru-auto-01.webp", "/field/ooro-bengaluru-auto-02.webp", "/field/ooro-installation-01.mp4"]) expect((await request.get(asset)).status(), asset).toBe(200);
  await page.goto("/field-journal");
  await expect(page.locator("video")).toHaveAttribute("preload", "none");
  await expect(page.locator("video source")).toHaveAttribute("src", "/field/ooro-installation-01.mp4");
});

test("new public pages meet automated WCAG A/AA checks", async ({ page }) => {
  for (const path of ["/digital-advertising-bengaluru", "/auto-rickshaw-advertising-bangalore", "/outdoor-advertising-bengaluru", "/small-business-advertising-bangalore", "/auto-advertising-cost-bengaluru", "/guides", "/guides/auto-rickshaw-advertising", "/tools/ad-budget-planner", "/field-journal"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations, `${path}: ${result.violations.map(v => v.id).join(", ")}`).toEqual([]);
  }
});

test("campaign navigation CTA is available on mobile widths and with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /plan a campaign/i }).first()).toBeVisible();
  expect(await page.locator("body").evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(390);
});
