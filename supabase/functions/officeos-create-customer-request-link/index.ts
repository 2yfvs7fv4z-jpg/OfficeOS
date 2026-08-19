import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"https://officeospro.com","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, content-type, apikey, x-client-info"};
function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}})}
function hex(bytes:ArrayBuffer){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function hash(token:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))}
function token(){const a=new Uint8Array(32);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json(405,{ok:false,error:'Method not allowed'});
 try{
  const auth=req.headers.get('Authorization')||'';if(!auth.startsWith('Bearer '))return json(401,{ok:false,error:'Sign in required'});
  const url=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||'',serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}}),service=createClient(url,serviceKey,{auth:{persistSession:false}});
  const jwt=auth.slice(7),{data:{user},error:userError}=await userClient.auth.getUser(jwt);if(userError||!user)return json(401,{ok:false,error:'Session expired'});
  const body=await req.json(),companyRef=String(body?.companyRef||'').trim();if(!companyRef)return json(400,{ok:false,error:'Company is required'});
  const {data:company,error:companyError}=await service.from('companies').select('id,name,external_ref,owner_id').eq('owner_id',user.id).eq('external_ref',companyRef).maybeSingle();if(companyError)throw companyError;if(!company)return json(404,{ok:false,error:'Secure company record not found'});
  await service.from('customer_request_links').update({status:'revoked',updated_at:new Date().toISOString()}).eq('owner_id',user.id).eq('company_id',company.id).eq('status','active');
  const raw=token(),tokenHash=await hash(raw),expires=new Date(Date.now()+365*24*60*60*1000).toISOString();
  const {data:row,error}=await service.from('customer_request_links').insert({owner_id:user.id,company_id:company.id,token_hash:tokenHash,status:'active',expires_at:expires}).select('id,expires_at').single();if(error)throw error;
  return json(200,{ok:true,id:row.id,url:`https://officeospro.com/request.html?token=${encodeURIComponent(raw)}`,expiresAt:row.expires_at});
 }catch(e){console.error(e);return json(500,{ok:false,error:e instanceof Error?e.message:'Could not create request link'})}
});