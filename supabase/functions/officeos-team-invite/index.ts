import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"https://officeospro.com","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, content-type, apikey, x-client-info"};
const roles=new Set(["office_manager","sales","field"]);
function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}})}

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return json(405,{ok:false,error:"Method not allowed"});
 try{
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))return json(401,{ok:false,error:"Sign in required"});
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!anon||!serviceKey)throw new Error("Server configuration is incomplete");
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const service=createClient(url,serviceKey,{auth:{persistSession:false}});
  const {data:{user},error:userError}=await client.auth.getUser(auth.slice(7));
  if(userError||!user)return json(401,{ok:false,error:"Invalid session"});

  const body=await req.json();
  const companyRef=String(body?.companyRef||"").trim();
  const email=String(body?.email||"").trim().toLowerCase();
  const role=String(body?.role||"field");
  if(!companyRef||!email.includes("@")||!roles.has(role))return json(400,{ok:false,error:"Valid company, email and role are required"});

  let {data:company,error:companyLookupError}=await service.from("companies").select("id,name,owner_id,external_ref").eq("owner_id",user.id).eq("external_ref",companyRef).maybeSingle();
  if(companyLookupError)throw companyLookupError;
  if(!company){
    const {data:cloud,error:cloudError}=await client.from("officeos_data").select("data").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(1).maybeSingle();
    if(cloudError)throw cloudError;
    const legacy=Array.isArray(cloud?.data?.companies)?cloud.data.companies.find((c:any)=>String(c?.id)===companyRef):null;
    if(!legacy)return json(404,{ok:false,error:"Company not found"});
    const created=await service.from("companies").insert({owner_id:user.id,name:String(legacy.name||"OfficeOS Business").slice(0,200),external_ref:companyRef}).select("id,name,owner_id,external_ref").single();
    if(created.error)throw created.error;
    company=created.data;
  }

  const ownerMembership=await service.from("company_memberships").upsert({company_id:company.id,user_id:user.id,role:"owner",active:true,permissions:["*"]},{onConflict:"company_id,user_id"});
  if(ownerMembership.error)throw ownerMembership.error;

  const expiry=new Date(Date.now()+7*86400000).toISOString();
  let {data:invite,error:inviteLookupError}=await service.from("company_invites").select("id,status,expires_at").eq("company_id",company.id).eq("email",email).eq("status","pending").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(inviteLookupError)throw inviteLookupError;
  if(invite){
    const updated=await service.from("company_invites").update({role,invited_by:user.id,status:"pending",expires_at:expiry,accepted_by:null,accepted_at:null}).eq("id",invite.id).select("id,status,expires_at").single();
    if(updated.error)throw updated.error;
    invite=updated.data;
  }else{
    const inserted=await service.from("company_invites").insert({company_id:company.id,email,role,invited_by:user.id,status:"pending",expires_at:expiry}).select("id,status,expires_at").single();
    if(inserted.error)throw inserted.error;
    invite=inserted.data;
  }

  let existing:any=null;
  for(let page=1;page<=5&&!existing;page++){
    const {data,error}=await service.auth.admin.listUsers({page,perPage:200});
    if(error)break;
    existing=data.users.find(u=>String(u.email||"").toLowerCase()===email);
    if(data.users.length<200)break;
  }
  if(existing){
    const linked=await service.from("company_memberships").upsert({company_id:company.id,user_id:existing.id,role,active:true,invited_by:user.id},{onConflict:"company_id,user_id"});
    if(linked.error)throw linked.error;
    const accepted=await service.from("company_invites").update({status:"accepted",accepted_by:existing.id,accepted_at:new Date().toISOString()}).eq("id",invite.id);
    if(accepted.error)throw accepted.error;
    return json(200,{ok:true,status:"linked",companyId:company.id,message:"Existing OfficeOS user added to the company."});
  }

  const {error:authInviteError}=await service.auth.admin.inviteUserByEmail(email,{redirectTo:"https://officeospro.com/?team_invite=1",data:{officeos_company_ref:companyRef,officeos_role:role}});
  if(authInviteError)throw authInviteError;
  return json(200,{ok:true,status:"invited",companyId:company.id,expiresAt:invite.expires_at,message:"Secure employee invitation sent."});
 }catch(e){
  console.error(e);
  return json(500,{ok:false,error:e instanceof Error?e.message:"Unexpected error"});
 }
});
