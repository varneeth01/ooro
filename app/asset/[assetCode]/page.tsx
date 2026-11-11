import type { Metadata } from 'next'
import { backendApiUrl } from '@/lib/backend-url'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Asset Identification | OORO', robots: { index: false, follow: false } }
export default async function AssetPage({params}:{params:Promise<{assetCode:string}>}) {
 const {assetCode}=await params
 if(!/^[A-Z0-9-]{3,80}$/.test(assetCode)) return <main className="p-10">Invalid asset identifier.</main>
 const base=backendApiUrl()
 let data: {assetCode:string;title:string;kind:string;status:string;ownershipDocumentation:string;legalEntityName:string}|null=null
 try {const r=await fetch(`${base}/api/public/assets/${encodeURIComponent(assetCode)}`,{cache:'no-store'});if(r.ok){const j=await r.json();data=j.data}}catch{}
 if(!data) return <main className="mx-auto max-w-xl p-10"><h1 className="text-3xl font-bold">Asset not available</h1><p className="mt-3">The asset ID has not yet been registered or the service is temporarily unavailable.</p></main>
 return <main className="min-h-screen bg-neutral-50 p-6 sm:p-16"><article className="mx-auto max-w-xl rounded-3xl border bg-white p-8 shadow-sm"><p className="text-xs font-bold tracking-[.3em]">OORO · ASSET IDENTIFICATION</p><h1 className="mt-6 text-3xl font-semibold">{data.title}</h1><p className="mt-2 font-mono text-sm">{data.assetCode}</p><dl className="mt-8 grid grid-cols-2 gap-6 text-sm"><div><dt className="text-neutral-500">Type</dt><dd className="font-semibold">{data.kind}</dd></div><div><dt className="text-neutral-500">Status</dt><dd className="font-semibold">{data.status}</dd></div><div><dt className="text-neutral-500">Company record</dt><dd className="font-semibold">{data.legalEntityName}</dd></div><div><dt className="text-neutral-500">Ownership documents</dt><dd className="font-semibold">{data.ownershipDocumentation}</dd></div></dl><p className="mt-8 text-xs text-neutral-500">This identification page is not proof of legal title. Private documents are accessible only to authorized Super Admins.</p><a className="mt-6 inline-block underline" href={`/admin/assets/${encodeURIComponent(assetCode)}`}>Authorized administrator access</a></article></main>
}
