import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const viewports = [360, 390, 430, 768, 1024, 1280, 1440].map((width) => ({ width, height: width <= 430 ? 844 : width === 768 ? 1024 : 900 }));

test.describe("homepage visual matrix", () => {
  for (const viewport of [...viewports, { width: 1440, height: 700 }]) {
    test(`${viewport.width} × ${viewport.height} has no overflow and captures screenshot`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Your next customer");
      await expect(page.locator(".calm-hero-media img")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `artifacts/visual-acceptance/home-${viewport.width}x${viewport.height}.png`, fullPage: true, animations: "disabled" });
      if (viewport.width === 1440 && viewport.height === 700) {
        await page.screenshot({ path: "artifacts/visual-acceptance/home-short-desktop-viewport.png", animations: "disabled" });
        const primary = await page.locator(".calm-primary").boundingBox();
        expect(primary && primary.y + primary.height).toBeLessThanOrEqual(viewport.height);
      }
      const dimensions = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      expect(dimensions.document, `document width ${dimensions.document}px exceeds viewport ${dimensions.viewport}px`).toBeLessThanOrEqual(dimensions.viewport);
    });
  }
});

test("chapter explorer supports click, arrows, home, end and previous/next", async ({ page }) => {
  await page.goto("/");
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Next perspective" }).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").getByRole("heading")).toContainText("Get noticed beyond");
  await expect(page.getByRole("tabpanel").locator("img")).toHaveAttribute("src", /ooro-bengaluru-auto-02/);
  await page.getByRole("button", { name: "Previous perspective" }).click();
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
});

test("hero film dialog plays original footage and restores focus on Escape and close button", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /watch ooro in motion/i });
  const dialog = page.getByRole("dialog", { name: /ooro on-ground film/i });
  await trigger.click();
  await expect(dialog).toBeVisible();
  const video = dialog.locator("video");
  await expect(video.locator("source")).toHaveAttribute("src", "/field/ooro-installation-01.mp4");
  const playResult = await video.evaluate(async (element: HTMLVideoElement) => {
    try { await element.play(); return { played: !element.paused, currentTime: element.currentTime, error: "" }; }
    catch (error) { return { played: false, currentTime: element.currentTime, error: error instanceof Error ? error.message : String(error) }; }
  });
  expect(playResult.played, `video did not start: ${playResult.error}`).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  const stoppedState = await page.locator(".ooro-film-dialog video").evaluate((element: HTMLVideoElement) => ({ paused: element.paused, currentTime: element.currentTime }));
  expect(stoppedState).toEqual({ paused: true, currentTime: 0 });
  await trigger.click();
  await dialog.getByRole("button", { name: "Close video" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("mobile navigation opens, navigates and closes with touch-sized controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open navigation" });
  await expect(menu).toBeVisible();
  const size = await menu.boundingBox();
  expect(size?.width).toBeGreaterThanOrEqual(44);
  expect(size?.height).toBeGreaterThanOrEqual(44);
  await menu.click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNav.getByRole("link", { name: "How it works" })).toBeFocused();
  await mobileNav.getByRole("link", { name: "Field work" }).click();
  await expect(page).toHaveURL(/#reality$/);
  await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
});

test("reduced motion keeps content visible and disables chapter transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const transition = await page.getByRole("tab").first().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transition.split(",").every((duration) => Number.parseFloat(duration) <= 0.01)).toBeTruthy();
});

test("campaign planner route and original media respond", async ({ page, request }) => {
  await page.goto("/");
  await page.locator(".calm-primary").click();
  await expect(page).toHaveURL(/\/advertise$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const asset of ["/field/ooro-bengaluru-auto-01.webp", "/field/ooro-bengaluru-auto-02.webp", "/field/ooro-installation-01.mp4"]) {
    const response = await request.get(asset);
    expect(response.status(), asset).toBe(200);
  }
});

test("homepage has no WCAG A/AA violations, browser errors, or missing in-page anchors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto("/", { waitUntil: "networkidle" });
  const anchorTargets = await page.locator("a[href*='#']").evaluateAll((links) => links.map((link) => {
    const href = (link as HTMLAnchorElement).getAttribute("href") ?? "";
    return decodeURIComponent(href.split("#").at(-1) ?? "");
  }).filter(Boolean));
  const missingTargets = await page.evaluate((targets) => targets.filter((target) => !document.getElementById(target)), anchorTargets);
  expect(missingTargets).toEqual([]);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map(({ id, impact, description, nodes }) => ({ id, impact, description, elements: nodes.map((node) => node.target) }))).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
