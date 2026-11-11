import { expect, test } from "@playwright/test";

test("campaign planner initializes dates in IST after client hydration", async ({ page }) => {
  await page.goto("/advertise");
  const start = page.getByLabel("Start date");
  const end = page.getByLabel("End date");
  await expect(start).not.toHaveValue("");
  await expect(end).not.toHaveValue("");
  const ist = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => ist.find(x => x.type === type)?.value;
  const today = [value("year"), value("month"), value("day")].join("-");
  await expect(start).toHaveAttribute("min", today);
  await expect(end).toHaveAttribute("min", today);
  expect(await start.inputValue()).toBe(today);
  expect(await end.inputValue()).toBe(today);
});

test("campaign forecast rejects past dates instead of generating stale estimates", async ({ request }) => {
  const response = await request.post("/api/campaigns/forecast", {
    data: {
      budget: 3000,
      latitude: 12.9716,
      longitude: 77.5946,
      radiusKm: 3,
      startDate: "2024-01-01",
      endDate: "2024-01-05",
      deliveryTier: "STANDARD",
    },
  });
  expect(response.status()).toBe(422);
  expect((await response.json()).error.message).toMatch(/future campaign date range/i);
});

test("customer login cannot navigate to an external next URL even after login", async ({ page }) => {
  await page.route("**/api/auth", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
  await page.goto("/login?next=https%3A%2F%2Fevil.example%2F");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("example-password-123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard|\/login/);
  expect(new URL(page.url()).hostname).not.toBe("evil.example");
});
