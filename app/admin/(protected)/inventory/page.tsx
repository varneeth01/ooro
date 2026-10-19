import { PageHeader } from "@/components/app/app-ui";
import { InventorySummary } from "@/components/admin/pricing-inventory";
export default function AdminInventoryPage() { return <div className="space-y-8"><PageHeader title="Inventory" description="One auto-day is one allocated advertising slot, not exclusive screen ownership."/><InventorySummary/><p className="text-sm text-neutral-500">Default creative duration: 15 seconds. Slot capacity is planning capacity; commercial allocation depends on active screen inventory.</p></div>; }
