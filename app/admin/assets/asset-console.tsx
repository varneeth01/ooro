'use client'
import {useEffect,useState} from 'react'
import QRCode from 'qrcode'
type Asset={assetCode:string;title:string;status:string;ownershipStatus:string;legalEntityName:string;notes?:string|null}
type Doc={id:string;type:string;filename:string;createdAt:string}
const api='/api/internal/assets'
export default function AssetConsole({initialCode}:{initialCode?:string}){
 const [items,setItems]=useState<Asset[]>([])
 const [code,setCode]=useState(initialCode||'ANOK-OORO-DIS-0001')
 const [asset,setAsset]=useState<Asset|null>(null)
 const [docs,setDocs]=useState<Doc[]>([])
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [type,setType]=useState('OWNERSHIP_DECLARATION')
 const [file,setFile]=useState<File|null>(null)
 const [notes,setNotes]=useState('')
 const [qr,setQr]=useState('')
 async function call(path:string,init?:RequestInit){const r=await fetch(api+path,{credentials:'same-origin',...init});const json=await r.json();if(!r.ok)throw new Error(json.error?.message||json.error||'Request failed');return json.data}
 async function refresh(){try{const a=await call('');setItems(a)}catch(e){setError(String(e))}}
 async function load(id:string){try{setError('');const [a,d]=await Promise.all([call('/'+encodeURIComponent(id)),call('/'+encodeURIComponent(id)+'/documents')]);setAsset(a);setNotes(a.notes||'');setDocs(d);setCode(id)}catch(e){setError(String(e))}}
 useEffect(()=>{void refresh();if(initialCode)void load(initialCode)},[initialCode])
 useEffect(()=>{if(asset){void QRCode.toDataURL(window.location.origin+'/asset/'+encodeURIComponent(asset.assetCode),{width:480,margin:2,errorCorrectionLevel:'H'}).then(setQr).catch(()=>setQr(''))}},[asset])
 async function create(){setBusy(true);try{await call('',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({assetCode:code,title:'OORO Advertising Display',kind:'DISPLAY',ownershipStatus:'UNVERIFIED'})});await refresh();await load(code)}catch(e){setError(String(e))}finally{setBusy(false)}}
 async function save(){if(!asset)return;setBusy(true);try{await call('/'+code,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({notes})});await load(code)}catch(e){setError(String(e))}finally{setBusy(false)}}
 async function upload(){if(!file||!asset)return;setBusy(true);try{
  const intent=await call('/'+code+'/documents/upload-intent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({filename:file.name,type,contentType:file.type,sizeBytes:file.size})})
  const put=await fetch(intent.uploadUrl,{method:'PUT',headers:{'content-type':file.type},body:file})
  if(!put.ok)throw new Error('Upload failed: '+put.status)
  await call('/'+code+'/documents/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:intent.key,filename:file.name,type,contentType:file.type})})
  setFile(null);await load(code)
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 async function download(id:string){try{const r=await call('/'+code+'/documents/'+id+'/download');window.open(r.downloadUrl,'_blank','noopener,noreferrer')}catch(e){setError(String(e))}}
 return <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900 sm:p-12"><div className="mx-auto max-w-5xl"><p className="text-xs font-bold tracking-widest">OORO / SUPER ADMIN</p><h1 className="mt-3 text-3xl font-semibold">Asset Registry & Document Vault</h1><p className="mt-2 text-sm text-neutral-500">Permanent scan links and private ownership records. Only Super Admins can manage documents.</p>
 {error&&<p role="alert" className="mt-5 rounded-lg border border-red-300 p-3 text-red-700">{error}</p>}
 <section className="mt-8 rounded-2xl border bg-white p-6"><label className="block text-sm font-semibold" htmlFor="asset-code">Asset ID</label><input id="asset-code" className="mt-2 w-full rounded border p-3" value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/><div className="mt-3 flex flex-wrap gap-3"><button className="rounded bg-black px-4 py-2 text-white" onClick={()=>load(code)}>Open asset</button><button className="rounded border px-4 py-2" disabled={busy} onClick={create}>Register new asset</button></div><a className="mt-4 block text-sm underline" href={'/asset/'+encodeURIComponent(code)} target="_blank">Open public QR destination ↗</a></section>
 <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="font-semibold">Registered assets</h2><div className="mt-3 flex flex-wrap gap-2">{items.map(a=><button key={a.assetCode} className="rounded border px-3 py-2 text-sm" onClick={()=>load(a.assetCode)}>{a.assetCode}</button>)}</div></section>
 {asset&&<><section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">{asset.title}</h2>{qr&&<div className="mt-4"><img src={qr} alt="Asset QR code" width="180" height="180"/><a href={qr} download={asset.assetCode+".png"} className="mt-2 inline-block text-sm underline">Download QR sticker PNG</a></div>}<p className="mt-2 text-sm">Status: {asset.status} · Ownership: {asset.ownershipStatus}</p><label className="mt-5 block text-sm" htmlFor="asset-notes">Internal notes</label><textarea id="asset-notes" className="mt-2 w-full rounded border p-3" rows={3} value={notes} onChange={e=>setNotes(e.target.value)}/><button disabled={busy} className="rounded bg-black px-4 py-2 text-white" onClick={save}>Save notes</button></section>
 <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">Private ownership documents</h2><p className="mt-2 text-sm text-neutral-500">PDF, PNG or JPEG, up to 10 MB. No documents are visible on the public scan page.</p><select className="mt-4 w-full rounded border p-3" value={type} onChange={e=>setType(e.target.value)}>{['OWNERSHIP_DECLARATION','TRANSFER_DEED','INVOICE','HANDOVER','PAYMENT_PROOF','SERVICE','OTHER'].map(t=><option key={t}>{t}</option>)}</select><input aria-label="Choose ownership file" className="mt-4 block w-full" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="mt-4 rounded bg-black px-4 py-2 text-white disabled:opacity-50" disabled={!file||busy} onClick={upload}>{busy?'Processing…':'Upload document'}</button><ul className="mt-5 space-y-3">{docs.map(d=><li key={d.id} className="flex justify-between gap-3 border-t pt-3 text-sm"><span>{d.type} · {d.filename}</span><button className="underline" onClick={()=>download(d.id)}>Download</button></li>)}</ul></section></>}
 </div></main>
}
