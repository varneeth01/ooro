import test from "node:test"
import assert from "node:assert/strict"
import { validateCampaignDates } from "./campaign-validation.js"

const today = new Date("2026-09-09T12:00:00.000Z")

test("campaign dates preserve ISO calendar dates without month-index corruption", () => {
  assert.equal(validateCampaignDates({ startDate: "2099-01-26", endDate: "2099-02-09", status: "SCHEDULED" }, today), null)
})

test("campaign validation rejects reversed and past scheduled ranges", () => {
  assert.equal(validateCampaignDates({ startDate: "2099-02-09", endDate: "2099-01-26", status: "SCHEDULED" }, today), "End date must be on or after start date")
  assert.equal(validateCampaignDates({ startDate: "2020-01-01", endDate: "2020-01-02", status: "SCHEDULED" }, today), "A scheduled campaign cannot start in the past")
})
