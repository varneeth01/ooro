'use client'
import {useCallback,useEffect,useState} from 'react'
const roles=['ADMIN','SUPER_ADMIN','OPERATIONS','FINANCE','SUPPORT'] as const
type Admin={id:string;name:string|null;email:string|null;role:string;accountStatus:string;createdAt:string}
type Invite={id:string;email:string;name:string;role:string;expiresAt:string;acceptedAt:string|null;revokedAt:string|null}
export default function AdminUsersPage(){
 const [users,setUsers]=useState<Admin[]>([]),[invites,setInvites]=useState<Invite[]>([])
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[role,setRole]=useState<string>('OPERATIONS')
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false)
 const load=useCallback(async()=>{const [u,i]=await Promise.all([fetch('/api/admin/users',{cache:'no-store'}),fetch('/api/admin/users/invitations',{cache:'no-store'})]);if(!u.ok||!i.ok)throw new Error('Unable to load administrator accounts (Super Admin access required)');const ud=await u.json(),id=await i.json();setUsers(ud.data?.users??[]);setInvites(id.data??[]);setReady(true)},[])
 useEffect(()=>{load().catch(e=>setError(String(e.message??e)))},[load])
 async function request(path:string,method:string,body?:unknown){setBusy(true);setError('');try{const response=await fetch(path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error?.message??'Request failed');await load()}catch(e){setError(e instanceof Error?e.message:'Request failed')}finally{setBusy(false)}}
 return <main className="mx-auto max-w-6xl px-6 py-10 space-y-8 text-slate-900">
  <header><h1 className="text-3xl font-semibold">Administrators</h1><p className="text-slate-600 mt-2">Invite staff, manage permissions and secure active sessions. Super Admin only.</p></header>
  {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
  <section className="rounded-xl border p-5 space-y-4"><h2 className="text-xl font-semibold">Invite administrator</h2><form onSubmit={e=>{e.preventDefault();void request('/api/admin/users/invitations','POST',{name,email,role})}} className="grid gap-3 md:grid-cols-4">
    <input aria-label="Name" required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="rounded border p-2"/>
    <input aria-label="Email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Work email" className="rounded border p-2"/>
    <select aria-label="Role" value={role} onChange={e=>setRole(e.target.value)} className="rounded border p-2">{roles.map(x=><option key={x} value={x}>{x}</option>)}</select>
    <button disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Send invitation</button>
   </form><p className="text-sm text-slate-500">Invitation links expire after 48 hours. Invitees use their own phone and password.</p></section>
  <section className="rounded-xl border p-5 overflow-x-auto space-y-3"><h2 className="text-xl font-semibold">Accounts</h2>
    {!ready?<p>Loading…</p>:<table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Administrator</th><th className="p-2">Status</th><th className="p-2">Role</th><th className="p-2">Actions</th></tr></thead><tbody>{users.map(u=><tr key={u.id} className="border-b"><td className="p-2"><b>{u.name??'Unnamed'}</b><div className="text-slate-500">{u.email}</div></td><td className="p-2">{u.accountStatus}</td><td className="p-2"><select aria-label={'Role for '+u.email} defaultValue={u.role} key={u.id+u.role} disabled={busy} onChange={e=>{if(confirm('Change this administrator role? Active sessions will be revoked.'))void request('/api/admin/users/'+u.id,'PATCH',{role:e.target.value});else e.target.value=u.role}} className="rounded border p-2">{roles.map(x=><option key={x}>{x}</option>)}</select></td><td className="p-2 space-x-2"><button disabled={busy} className="rounded border p-2" onClick={()=>{if(confirm('Change account status?'))void request('/api/admin/users/'+u.id,'PATCH',{accountStatus:u.accountStatus==='ACTIVE'?'SUSPENDED':'ACTIVE'})}}>{u.accountStatus==='ACTIVE'?'Suspend':'Activate'}</button><button disabled={busy} className="rounded border p-2" onClick={()=>{if(confirm('Sign out this administrator from all sessions?'))void request('/api/admin/users/'+u.id+'/revoke-sessions','POST')}}>Revoke sessions</button></td></tr>)}</tbody></table>}
  </section>
  <section className="rounded-xl border p-5 space-y-3"><h2 className="text-xl font-semibold">Invitations</h2>{invites.length===0?<p className="text-slate-500">No invitations.</p>:<ul className="space-y-2">{invites.map(i=><li key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><span>{i.email} — {i.role} — {i.acceptedAt?'Accepted':i.revokedAt?'Revoked':new Date(i.expiresAt)<new Date()?'Expired':'Pending'}</span>{!i.revokedAt&&!i.acceptedAt&&<button disabled={busy} className="rounded border px-3 py-2" onClick={()=>{if(confirm('Revoke this invitation?'))void request('/api/admin/users/invitations/'+i.id+'/revoke','POST')}}>Revoke</button>}</li>)}</ul>}</section>
 </main>
}
