"use client";
import dynamic from "next/dynamic";
const LiveMapPage = dynamic(() => import("@/components/admin/live-map-page").then(module => module.LiveMapPage), { ssr: false, loading: () => <div className="p-8 text-sm text-neutral-500">Loading live map…</div> });
export function LiveMapClient() { return <LiveMapPage/>; }
