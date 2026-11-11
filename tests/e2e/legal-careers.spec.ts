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


test("policy layouts keep navbar and footer readable on desktop and mobile", async ({ page }) => {
  const relativeLuminance = (rgb: string) => {
    const values = rgb.match(/[\\d.]+/g)?.slice(0, 3).map(Number) ?? [];
    if (values.length !== 3) throw new Error(`Unsupported color: ${rgb}`);
    const linear = values.map(channel => {
      const n = channel / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const contrastAgainstDark = (foreground: string, background: string) => {
    const a = relativeLuminance(foreground);
    const b = relativeLuminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  for (const route of ["/privacy", "/terms"]) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const footerLink = page.getByRole("contentinfo", { name: "Site footer" }).getByRole("link", { name: "Privacy Policy" });
      const footerColors = await footerLink.evaluate(el => ({
        fg: getComputedStyle(el).color,
        bg: "rgb(8, 10, 9)",
      }));
      expect(contrastAgainstDark(footerColors.fg, footerColors.bg), `${route} footer contrast at ${width}px`).toBeGreaterThanOrEqual(4.5);

      if (width === 1440) {
        const navLink = page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "How it works" });
        const navColor = await navLink.evaluate(el => getComputedStyle(el).color);
        expect(contrastAgainstDark(navColor, "rgb(9, 11, 11)"), `${route} navbar contrast`).toBeGreaterThanOrEqual(4.5);
      } else {
        await page.getByRole("button", { name: "Open navigation" }).click();
        const mobileLink = page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "How it works" });
        const mobileColor = await mobileLink.evaluate(el => getComputedStyle(el).color);
        expect(contrastAgainstDark(mobileColor, "rgb(12, 15, 14)"), `${route} mobile menu contrast`).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});
