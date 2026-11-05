import test from "node:test";
import assert from "node:assert/strict";
import { deploymentRequestError, validateDeploymentForm, type DeploymentFormValues } from "./deviceos-deployment-form.js";

const appId = "8d7b8c51-e92c-44be-8b9f-9c562bc40cc8";
const releaseId = "0b7a3b44-54bb-4476-82ab-0c48621dc83e";
const deviceId = "fcdebf21-5cea-49e0-b3d8-63aa7d332e4f";
const groupId = "1e105a13-c341-47a7-b128-67e4eea95e12";
const base: DeploymentFormValues = {
  name: "Staged rollout",
  applicationId: appId,
  releaseId,
  targetingMode: "DEVICES",
  groupId: "",
  city: "",
  targetPercentage: "",
  maintenanceWindowStart: "",
  maintenanceWindowEnd: "",
  maxFailureRatePercent: "10",
  minimumHealthyPercent: "",
};
const apps = [{ id: appId, packageName: "com.ooro.test", allowed: true }];
const releases = [{ id: releaseId, packageName: "com.ooro.test", approvalStatus: "APPROVED" }];
const devices = [{ id: deviceId, enrollmentStatus: "ENROLLED" }];
const groups = [{ id: groupId }];
const validate = (form = base, selectedDevices = [deviceId]) => validateDeploymentForm(form, apps, releases, devices, groups, selectedDevices);

test("deployment form requires a selected application and approved release", () => {
  assert.match(validate({ ...base, applicationId: "" }).applicationId, /Select an application/);
  assert.match(validate({ ...base, releaseId: "" }).releaseId, /Select an approved release/);
  assert.match(validate({ ...base, releaseId: "not-a-uuid" }).releaseId, /Select an approved release/);
  assert.match(validateDeploymentForm(base, apps, [{ ...releases[0], packageName: "com.other.app" }], devices, groups, [deviceId]).releaseId, /belonging to this application/);
  assert.match(validateDeploymentForm(base, [{ ...apps[0], allowed: false }], releases, devices, groups, [deviceId]).applicationId, /application is blocked/);
});

test("deployment form requires an enrolled device for device targeting", () => {
  assert.match(validate(base, []).deviceIds, /at least one enrolled device/);
  assert.match(validate(base, [groupId]).deviceIds, /enrolled device list/);
});

test("deployment form validates group, city, and percentage targeting", () => {
  assert.match(validate({ ...base, targetingMode: "GROUP" }).groupId, /Select a device group/);
  assert.match(validate({ ...base, targetingMode: "CITY", city: "  " }).city, /Enter a city/);
  assert.match(validate({ ...base, targetingMode: "PERCENTAGE", targetPercentage: "101" }).targetPercentage, /1 to 100/);
});

test("deployment form validates health limits and maintenance window ordering", () => {
  assert.match(validate({ ...base, maxFailureRatePercent: "101" }).maxFailureRatePercent, /0 to 100/);
  assert.match(validate({ ...base, minimumHealthyPercent: "-1" }).minimumHealthyPercent, /0 to 100/);
  assert.match(validate({ ...base, maintenanceWindowStart: "2026-11-04T12:00", maintenanceWindowEnd: "2026-11-04T11:00" }).maintenanceWindowEnd, /at or after/);
});

test("a complete Super Admin device deployment form has no validation errors", () => {
  assert.deepEqual(validate(base, [deviceId]), {});
});

test("server deployment errors are translated to actionable field guidance", () => {
  assert.match(deploymentRequestError("TARGET_DEVICES_REQUIRED"), /Select at least one/);
  assert.match(deploymentRequestError(undefined, "Invalid UUID; Invalid UUID"), /Reselect the application/);
});
