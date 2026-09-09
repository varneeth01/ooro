import test from "node:test"
import assert from "node:assert/strict"
import { getDisplayConnectivity } from "./display-health.js"

const now = Date.parse("2026-09-09T12:00:00.000Z")

test("display heartbeat connectivity transitions from online to stale to offline", () => {
  const reference = new Date(now)
  assert.equal(getDisplayConnectivity(new Date("2026-09-09T11:59:30.000Z"), reference), "ONLINE")
  assert.equal(getDisplayConnectivity(new Date("2026-09-09T11:57:00.000Z"), reference), "STALE")
  assert.equal(getDisplayConnectivity(new Date("2026-09-09T11:50:00.000Z"), reference), "OFFLINE")
  assert.equal(getDisplayConnectivity(undefined, reference), "NEVER_CONNECTED")
})
