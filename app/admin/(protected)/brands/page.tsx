import { PageHeader } from "@/components/app/app-ui";
import { VerificationQueue } from "@/components/admin/verification-queue";
export default function AdminBrandsPage() { return <div className="space-y-8"><PageHeader title="Brands" description="Brand verification and commercial access are managed from the verification queue."/><VerificationQueue/></div>; }
