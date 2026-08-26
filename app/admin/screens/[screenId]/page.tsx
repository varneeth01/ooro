import { ScreenDetailPage } from "@/components/admin/screen-detail-page";
export default async function Page({ params }: { params: Promise<{ screenId: string }> }) { return <ScreenDetailPage screenId={(await params).screenId}/>; }
