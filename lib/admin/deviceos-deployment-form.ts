export type DeploymentFormValues = {
  name: string
  applicationId: string
  releaseId: string
  targetingMode: string
  groupId: string
  city: string
  targetPercentage: string
  maintenanceWindowStart: string
  maintenanceWindowEnd: string
  maxFailureRatePercent: string
  minimumHealthyPercent: string
}

type ApplicationOption = { id: string; packageName: string; allowed: boolean }
type ReleaseOption = { id: string; packageName: string; approvalStatus: string }
type DeviceOption = { id: string; enrollmentStatus: string }
type GroupOption = { id: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateDeploymentForm(
  form: DeploymentFormValues,
  applications: ApplicationOption[],
  releases: ReleaseOption[],
  devices: DeviceOption[],
  groups: GroupOption[],
  deviceIds: string[],
) {
  const errors: Record<string, string> = {}
  const application = applications.find(item => item.id === form.applicationId)
  const release = releases.find(item => item.id === form.releaseId)
  const enrolledIds = new Set(devices.filter(item => item.enrollmentStatus === "ENROLLED").map(item => item.id))

  if (!form.name.trim()) errors.name = "Enter a deployment name."
  if (!UUID.test(form.applicationId) || !application) errors.applicationId = "Select an application from the list."
  else if (!application.allowed) errors.applicationId = "This application is blocked. Allow it before creating a deployment."
  if (!UUID.test(form.releaseId) || !release) errors.releaseId = "Select an approved release."
  else if (release.approvalStatus !== "APPROVED") errors.releaseId = "Only approved releases can be deployed."
  else if (application && release.packageName !== application.packageName) errors.releaseId = "Select a release belonging to this application."

  if (form.targetingMode === "DEVICES") {
    if (!deviceIds.length) errors.deviceIds = "Select at least one enrolled device."
    else if (deviceIds.some(id => !UUID.test(id) || !enrolledIds.has(id))) errors.deviceIds = "Select devices from the enrolled device list."
  } else if (form.targetingMode === "GROUP") {
    if (!UUID.test(form.groupId) || !groups.some(group => group.id === form.groupId)) errors.groupId = "Select a device group."
  } else if (form.targetingMode === "CITY") {
    if (!form.city.trim()) errors.city = "Enter a city for targeting."
    else if (form.city.trim().length > 120) errors.city = "City must be 120 characters or fewer."
  } else if (form.targetingMode === "PERCENTAGE") {
    const percentage = Number(form.targetPercentage)
    if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) errors.targetPercentage = "Enter a whole-number cohort from 1 to 100%."
  } else {
    errors.targetingMode = "Choose a supported targeting method."
  }

  const maxFailure = Number(form.maxFailureRatePercent)
  if (!form.maxFailureRatePercent.trim() || !Number.isInteger(maxFailure) || maxFailure < 0 || maxFailure > 100) errors.maxFailureRatePercent = "Enter a whole-number failure limit from 0 to 100%."
  if (form.minimumHealthyPercent.trim()) {
    const minimumHealthy = Number(form.minimumHealthyPercent)
    if (!Number.isInteger(minimumHealthy) || minimumHealthy < 0 || minimumHealthy > 100) errors.minimumHealthyPercent = "Enter a whole-number healthy threshold from 0 to 100%."
  }

  const hasStart = Boolean(form.maintenanceWindowStart)
  const hasEnd = Boolean(form.maintenanceWindowEnd)
  if (hasStart !== hasEnd) errors.maintenanceWindowEnd = "Enter both maintenance window dates."
  else if (hasStart && hasEnd) {
    const start = new Date(form.maintenanceWindowStart).getTime()
    const end = new Date(form.maintenanceWindowEnd).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) errors.maintenanceWindowEnd = "End time must be at or after the start time."
  }

  return errors
}

export function deploymentRequestError(code?: string, message?: string) {
  const known: Record<string, string> = {
    TARGET_DEVICES_REQUIRED: "Select at least one enrolled device.",
    TARGET_GROUP_REQUIRED: "Select a device group.",
    TARGET_CITY_REQUIRED: "Enter a city for targeting.",
    TARGET_PERCENTAGE_INVALID: "Enter a whole-number cohort from 1 to 100%.",
    RELEASE_APPLICATION_MISMATCH: "The selected release does not belong to this application. Choose an approved release for the selected application.",
    RELEASE_NOT_APPROVED: "This release is not approved for deployment.",
    NO_DEPLOYMENT_TARGETS: "No enrolled devices match this targeting selection.",
    MAINTENANCE_WINDOW_INVALID: "Enter a valid maintenance window with an end time after its start.",
    HEALTH_GATE_INVALID: "Check the healthy-device threshold values.",
    FAILURE_RATE_INVALID: "Maximum failure rate must be between 0 and 100%.",
  }
  if (code && known[code]) return known[code]
  if (message?.includes("Invalid UUID")) return "One of the selected IDs is invalid. Reselect the application, release, group, or devices from the lists."
  return message || "Could not create the deployment. Please try again."
}
