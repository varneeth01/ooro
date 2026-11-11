import { expect, test } from "@playwright/test";

test("Bengaluru digital advertising pillar answers the actual search intent", async ({ page }) => {
  const response = await page.goto("/digital-advertising-bengaluru");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Digital Advertising in Bengaluru/i);
  await expect(page.getByRole("heading", { name: /Digital advertising in Bengaluru, beyond the phone/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Which type of digital advertising/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Frequently asked questions/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Plan advertising in Bengaluru/i })).toHaveAttribute("href", "/advertise");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/digital-advertising-bengaluru$/);
  expect(await page.locator("h1").count()).toBe(1);
});

test("the main site footer points crawlers and visitors to Bengaluru SEO pillar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Digital advertising in Bengaluru" })).toHaveAttribute("href", "/digital-advertising-bengaluru");
});
