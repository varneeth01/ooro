import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3139";
const output = "artifacts/visual-acceptance/screenshots";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const errors = [];
const widths = [360, 390, 430, 768, 1024, 1280, 1440];
for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: width < 800 ? 844 : 900 }, deviceScaleFactor: width < 800 ? 2 : 1, reducedMotion: "reduce" });
  page.on("pageerror", error => errors.push(`${width}px ${error.message}`));
  page.on("console", message => { if (message.type() === "error") errors.push(`${width}px console: ${message.text()}`); });
  const response = await page.goto(base, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true, animations: "disabled" });
  const scrollWidth = await page.locator("body").evaluate(el => el.scrollWidth);
  const h1Count = await page.locator("h1").count();
  console.log(JSON.stringify({ width, status: response?.status(), scrollWidth, h1Count }));
  if (scrollWidth > width) errors.push(`${width}px horizontal overflow: ${scrollWidth}`);
  if (h1Count !== 1) errors.push(`${width}px H1 count ${h1Count}`);
  if (width <= 430) {
    const menu = page.getByRole("button", { name: /navigation/i });
    if (await menu.count()) { await menu.click(); await page.screenshot({ path: `${output}/menu-${width}.png`, fullPage: true, animations: "disabled" }); }
  }
  await page.close();
}
for (const [path, name] of [["/guides", "guides"], ["/auto-rickshaw-advertising-bangalore", "auto-service"], ["/tools/ad-budget-planner", "budget-planner"], ["/field-journal", "field-journal"]]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  page.on("pageerror", error => errors.push(`${path} ${error.message}`));
  page.on("console", message => { if (message.type() === "error") errors.push(`${path} console: ${message.text()}`); });
  const response = await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${output}/${name}-390.png`, fullPage: true, animations: "disabled" });
  if (response?.status() !== 200) errors.push(`${path} returned ${response?.status()}`);
  await page.close();
}
await browser.close();
await fs.writeFile(`${output}/browser-errors.json`, JSON.stringify(errors, null, 2));
console.log(JSON.stringify({ errors }));
if (errors.length) process.exitCode = 1;
