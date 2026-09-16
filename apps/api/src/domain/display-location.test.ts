import test from "node:test"
import assert from "node:assert/strict"
import { boundedLocationLimit, shouldRecordDisplayLocation, validDisplayLocation } from "./display-location.js"

const now = new Date("2026-09-12T00:00:00.000Z")
const point = { latitude: 12.97, longitude: 77.59, accuracyMeters: 8, occurredAt: now }

test("location validation rejects impossible, non-finite, inaccurate and stale points", () => {
  assert.equal(validDisplayLocation(point, now), true)
  assert.equal(validDisplayLocation({ ...point, latitude: 91 }, now), false)
  assert.equal(validDisplayLocation({ ...point, longitude: Number.POSITIVE_INFINITY }, now), false)
  assert.equal(validDisplayLocation({ ...point, accuracyMeters: -1 }, now), false)
  assert.equal(validDisplayLocation({ ...point, occurredAt: new Date(now.getTime() - 11 * 60_000) }, now), false)
})

test("location history ignores near-duplicate stationary points and records movement or elapsed stationary time", () => {
  assert.equal(shouldRecordDisplayLocation(null, point), true)
  assert.equal(shouldRecordDisplayLocation(point, { ...point, latitude: 12.9701, occurredAt: new Date(now.getTime() + 20_000) }), false)
  assert.equal(shouldRecordDisplayLocation(point, { ...point, latitude: 12.972, occurredAt: new Date(now.getTime() + 20_000) }), true)
  assert.equal(shouldRecordDisplayLocation(point, { ...point, occurredAt: new Date(now.getTime() + 90_000) }), true)
})

test("location history limit is bounded", () => {
  assert.equal(boundedLocationLimit(), 200)
  assert.equal(boundedLocationLimit("5000"), 1000)
  assert.equal(boundedLocationLimit("0"), 200)
})
