import test from "node:test";
import assert from "node:assert/strict";
import { forecastChangedMaterially, forecastExpiresAt, isForecastFresh } from "./forecast-integrity.js";
test("forecast expiry defaults to fifteen minutes", () => { const generated = new Date("2026-01-01T00:00:00Z"); assert.equal(forecastExpiresAt(generated).toISOString(), "2026-01-01T00:15:00.000Z"); assert.equal(isForecastFresh(generated, new Date("2026-01-01T00:14:59Z")), true); assert.equal(isForecastFresh(generated, new Date("2026-01-01T00:15:00Z")), false); });
test("material forecast changes are detected", () => { assert.equal(forecastChangedMaterially({ low: 2400, high: 2800 }, { low: 1700, high: 2100 }), true); assert.equal(forecastChangedMaterially({ low: 2400, high: 2800 }, { low: 2300, high: 2700 }), false); });
