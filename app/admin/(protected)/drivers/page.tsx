import { PageHeader } from "@/components/app/app-ui";
import { DriverRegistrationQueue } from "@/components/admin/driver-registration-queue";
import { getAuthenticatedAdmin } from "@/lib/auth/backend-session";

export default async function AdminDriversPage() {
  const admin = await getAuthenticatedAdmin({ refreshSession: false });
  return <div className="space-y-8"><PageHeader eyebrow="Operations / Drivers" title="Driver registrations" description="Add driver profiles and review onboarding, identity documents, vehicle readiness, agreements, and activation decisions."/><DriverRegistrationQueue canCreate={admin.role === "SUPER_ADMIN"}/></div>;
}
