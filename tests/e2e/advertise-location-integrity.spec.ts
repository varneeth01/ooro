import { expect, test } from "@playwright/test";

test("unknown typed location cannot submit a forecast for Bengaluru coordinates", async ({ page }) => {
  const forecasts: string[] = [];
  await page.route("**/api/campaigns/forecast", route => {
    forecasts.push(route.request().postData() ?? "");
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ estimatedImpressionsLow: 100, estimatedImpressionsHigh: 200, campaignDays: 1, availability: "AVAILABLE", confidence: "EARLY_ESTIMATE" }) });
  });
  await page.goto("/advertise");
  const location = page.getByLabel("Location or address");
  await expect(location).toHaveValue("Bengaluru");
  await expect(page.getByRole("button", { name: /Continue to campaign request|Request manual availability review/ })).toBeEnabled();
  await location.fill("Unrecognized Place 999999");
  await expect(page.getByText(/cannot estimate delivery for an unverified location/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue to campaign request|Request manual availability review/ })).toBeDisabled();
  const count = forecasts.length;
  await page.waitForTimeout(450);
  expect(forecasts.length).toBe(count);
  await location.fill("Hyderabad");
  await expect(page.getByRole("button", { name: /Continue to campaign request|Request manual availability review/ })).toBeEnabled();
});
