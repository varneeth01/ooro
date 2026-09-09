import test from "node:test"
import assert from "node:assert/strict"
import { validateCampaignContinuation } from "./campaign-transition.js"

const valid = {
  status: "DRAFT",
  hasCreative: true,
  activeDisplayCount: 1,
  startDate: "2099-09-09",
  endDate: "2099-09-30",
  budget: 500,
  today: new Date("2026-09-09T12:00:00.000Z"),
}

test("allows a valid campaign with pending display delivery", () => {
  assert.equal(validateCampaignContinuation(valid), null)
})

test("requires a persisted creative", () => {
  assert.equal(validateCampaignContinuation({ ...valid, hasCreative: false }), "Persist a creative before continuing setup")
})

test("requires an active display assignment", () => {
  assert.equal(validateCampaignContinuation({ ...valid, activeDisplayCount: 0 }), "Assign at least one display before continuing setup")
})

test("rejects invalid schedule and budget", () => {
  assert.equal(validateCampaignContinuation({ ...valid, startDate: "2020-09-09" }), "A scheduled campaign cannot start in the past")
  assert.equal(validateCampaignContinuation({ ...valid, budget: 0 }), "Budget must be greater than zero")
})

test("makes an already scheduled retry idempotent", () => {
  assert.equal(validateCampaignContinuation({ ...valid, status: "SCHEDULED", hasCreative: false, activeDisplayCount: 0 }), null)
})
