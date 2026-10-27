import type { PrismaClient } from '@prisma/client'

export const REQUIRED_DRIVER_DOCUMENTS = ['AADHAAR', 'PAN', 'DRIVING_LICENCE', 'RC']
export const REQUIRED_DRIVER_PERMISSIONS = ['LOCATION', 'DATA_PROCESSING']

export async function getDriverActivationEligibility(prisma: PrismaClient, driverId: string) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, include: { user: true, documents: true, vehicles: { include: { displays: true } }, consents: { include: { agreementVersion: true } }, permissionGrants: true, beneficiaries: true } })
  if (!driver) return { eligible: false, reasons: ['DRIVER_NOT_FOUND'], advertisingEligible: false }
  const verifiedDocuments = new Set(driver.documents.filter((document) => document.status === 'VERIFIED').map((document) => document.documentType))
  const missingDocuments = REQUIRED_DRIVER_DOCUMENTS.filter((type) => !verifiedDocuments.has(type))
  const requiredAgreements = await prisma.agreementVersion.findMany({ where: { required: true }, select: { id: true, type: true, version: true } })
  const acceptedAgreements = new Set(driver.consents.filter((consent) => !consent.revokedAt).map((consent) => consent.agreementVersionId))
  const missingAgreements = requiredAgreements.filter((agreement) => !acceptedAgreements.has(agreement.id)).map((agreement) => agreement.id)
  const missingPermissions = REQUIRED_DRIVER_PERMISSIONS.filter((permission) => !driver.permissionGrants.some((grant) => grant.permission === permission && grant.granted && !grant.revokedAt))
  const verifiedVehicle = driver.vehicles.find((vehicle) => ['VERIFIED', 'ACTIVE'].includes(vehicle.status))
  const reasons = [
    ...(driver.user.accountStatus !== 'ACTIVE' ? ['ACCOUNT_NOT_APPROVED'] : []),
    ...(driver.onboardingStatus !== 'APPROVED' ? ['DRIVER_NOT_APPROVED'] : []),
    ...(missingDocuments.length ? ['DOCUMENTS_INCOMPLETE'] : []),
    ...(missingAgreements.length ? ['AGREEMENTS_INCOMPLETE'] : []),
    ...(missingPermissions.length ? ['PERMISSIONS_INCOMPLETE'] : []),
    ...(!verifiedVehicle ? ['VEHICLE_NOT_VERIFIED'] : []),
  ]
  const display = verifiedVehicle?.displays.find((candidate) => ['READY', 'PAIRING', 'ACTIVE'].includes(candidate.state))
  return { eligible: reasons.length === 0, reasons, advertisingEligible: reasons.length === 0 && Boolean(display), missingDocuments, missingAgreements, missingPermissions, vehicleId: verifiedVehicle?.id, displayId: display?.id, accountStatus: driver.user.accountStatus, onboardingStatus: driver.onboardingStatus }
}
