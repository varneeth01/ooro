import { PageHeader } from "@/components/app/app-ui";
import { DriverRegistrationQueue } from "@/components/admin/driver-registration-queue";

export default function AdminDriversPage() {
  return <div className="space-y-8"><PageHeader eyebrow="Operations / Drivers" title="Driver registrations" description="Review onboarding, identity documents, vehicle readiness, agreements, and activation decisions."/><DriverRegistrationQueue/></div>;
}
