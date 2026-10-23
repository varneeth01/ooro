'use client'
import {useState, type FormEvent} from 'react'
export default function AcceptInvitePage(){
 const [phone,setPhone]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 async function accept(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
 const token=new URLSearchParams(window.location.search).get('token')??''
 const base=process.env.NEXT_PUBLIC_API_URL
 if(!base)throw new Error('Invitation service is not configured')
 const response=await fetch(base.replace(/\/$/,'')+'/api/auth/admin/accept-invitation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,phone,password})})
 const data=await response.json();if(!response.ok)throw new Error(data.error?.message??'Invitation cannot be accepted')
 setMessage('Account created. Sign in at /admin/login.')
 }catch(e){setMessage(e instanceof Error?e.message:'Unable to accept invitation')}finally{setBusy(false)}}
 return <main className="mx-auto max-w-lg px-6 py-16 space-y-6"><h1 className="text-3xl font-semibold">Join OORO administration</h1><p>Complete your invitation with your mobile number and a unique password.</p><form onSubmit={accept} className="space-y-4"><label className="block">Indian mobile number<input className="block w-full rounded border p-3" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91…"/></label><label className="block">Password (12–128 characters)<input type="password" minLength={12} maxLength={128} required className="block w-full rounded border p-3" value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy} className="rounded bg-slate-900 px-5 py-3 text-white">Accept invitation</button></form>{message&&<p role="status">{message}</p>}</main>
}
