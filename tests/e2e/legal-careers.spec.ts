import { expect, test } from "@playwright/test";

test("careers lists exactly the two requested internships with actionable links", async ({ page }) => {
  await page.goto("/careers");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Build things");
  const roles = page.getByRole("article").filter({ has: page.getByRole("link", { name: /apply by email/i }) });
  await expect(roles).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Android Development Intern" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Full-Stack Web Development Intern" })).toBeVisible();
  const applyLinks = page.getByRole("link", { name: /apply by email/i });
  await expect(applyLinks).toHaveCount(2);
  for (const index of [0, 1]) {
    await expect(applyLinks.nth(index)).toHaveAttribute("href", /^mailto:varneeth@theooro\.com\?subject=/);
  }
});

test("contact, policy and terms routes render substantive content, with legal drafts not indexed", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /varneeth@theooro.com/i })).toHaveAttribute("href", "mailto:varneeth@theooro.com");
  for (const route of ["/privacy", "/terms"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByText("Publication review:", { exact: false })).toBeVisible();
  }
});

test("interactive chapters use distinct editorial graphics rather than repeated photographs", async ({ page }) => {
  await page.goto("/");
  for (let index = 0; index < 3; index++) {
    await page.getByRole("tab").nth(index).click();
    await expect(page.getByRole("tabpanel").getByRole("img", { name: /editorial illustration representing/i })).toBeVisible();
    await expect(page.getByRole("tabpanel").locator("img")).toHaveCount(0);
  }
});

test("footer surfaces careers, contact and legal policies", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo", { name: "Site footer" });
  for (const route of ["/careers", "/contact", "/privacy", "/terms"]) {
    await expect(footer.locator(`a[href="${route}"]`)).toHaveCount(1);
  }
});
