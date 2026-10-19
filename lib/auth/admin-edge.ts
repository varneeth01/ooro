import { backendApiUrl } from '@/lib/backend-url';

/** Edge middleware verifies the same AES-GCM session envelope as the server. */
export async function verifyAdminEnvelope(value: string | undefined): Promise<'allowed'|'anonymous'|'forbidden'|'unavailable'> {
 if(!value)return 'anonymous';
 const secret=process.env.OORO_SESSION_SECRET||process.env.JWT_SECRET||(process.env.NODE_ENV!=='production'?'ooro-local-session-secret':'');
 if(!secret || (process.env.NODE_ENV==='production'&&secret.length<32))return 'unavailable';
 let accessToken:string;
 try{
  const parts=value.split('.');if(parts.length!==3)return 'anonymous';
  const decode=(v:string)=>Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const [iv,tag,body]=parts.map(decode);
  const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)),{name:'AES-GCM'},false,['decrypt']);
  const encrypted=new Uint8Array(body.length+tag.length);encrypted.set(body);encrypted.set(tag,body.length);
  const tokens=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},key,encrypted)));
  if(typeof tokens.accessToken!=='string')return 'anonymous';accessToken=tokens.accessToken;
 }catch{return 'anonymous';}
 try{
  const base=backendApiUrl();if(!base)return 'unavailable';
  const r=await fetch(`${base}/api/auth/session`,{headers:{authorization:`Bearer ${accessToken}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(r.status===401)return 'anonymous';if(r.status===403)return 'forbidden';if(!r.ok)return 'unavailable';
  const body=await r.json();return ['ADMIN','SUPER_ADMIN','OPERATIONS'].includes(body.data?.role)?'allowed':'forbidden';
 }catch{return 'unavailable';}
}
