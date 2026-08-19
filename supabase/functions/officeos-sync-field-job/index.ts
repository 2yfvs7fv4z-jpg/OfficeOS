import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"https://officeospro.com","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, content-type, apikey, x-client-info"};
function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}})}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return json(405,{ok:false,error:"Method not allowed"});
 try{
  const auth=req.headers.get("Authorization")||"";if(!auth.startsWith("Bearer "))return json(401,{ok:false,error:"Sign in required"});
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}}),service=createClient(url,serviceKey,{auth:{persistSession:false}});
  const {data:{user},error:userError}=await client.auth.getUser(auth.slice(7));if(userError||!user)return json(401,{ok:false,error:"Invalid session"});
  const body=await req.json(),jobRef=String(body?.jobRef||"").trim();if(!jobRef)return json(400,{ok:false,error:"jobRef is required"});
  const {data:cloud,error:cloudError}=await client.from("officeos_data").select("data").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(1).maybeSingle();if(cloudError)throw cloudError;
  const job=Array.isArray(cloud?.data?.jobs)?cloud.data.jobs.find((j:any)=>String(j?.id)===jobRef):null;if(!job)return json(404,{ok:false,error:"Job not found"});
  const companyRef=String(job.company||"");const legacyCompany=Array.isArray(cloud?.data?.companies)?cloud.data.companies.find((c:any)=>String(c?.id)===companyRef):null;if(!legacyCompany)return json(404,{ok:false,error:"Company not found"});
  let {data:company,error:companyError}=await service.from("companies").select("id").eq("owner_id",user.id).eq("external_ref",companyRef).maybeSingle();if(companyError)throw companyError;
  if(!company){const created=await service.from("companies").insert({owner_id:user.id,name:String(legacyCompany.name||"OfficeOS Business").slice(0,200),external_ref:companyRef}).select("id").single();if(created.error)throw created.error;company=created.data}
  const ownerMembership=await service.from("company_memberships").upsert({company_id:company.id,user_id:user.id,role:"owner",active:true,permissions:["*"]},{onConflict:"company_id,user_id"});if(ownerMembership.error)throw ownerMembership.error;
  const customer=Array.isArray(cloud?.data?.customers)?cloud.data.customers.find((c:any)=>c?.company===companyRef&&String(c?.name||"").trim().toLowerCase()===String(job.customer||"").trim().toLowerCase()):null;
  const playbook=legacyCompany?.playbook&&typeof legacyCompany.playbook==='object'?legacyCompany.playbook:{};
  const jobType=String(job.jobType||"").trim();
  const hay=`${jobType} ${String(job.title||"")}`.toLowerCase();
  const requiredTypes=Array.isArray(playbook.completionPhotoJobTypes)?playbook.completionPhotoJobTypes:[];
  const typeRequiresPhoto=requiredTypes.some((t:any)=>{const n=String(t||"").trim().toLowerCase();return n&&hay.includes(n)});
  const requirePhoto=playbook.requireCompletionPhoto===true||typeRequiresPhoto;
  const requireChecklist=playbook?.fieldCompletion?.requireChecklist===true;
  const packet=job.jobPacket&&typeof job.jobPacket==='object'?{...job.jobPacket}:{};
  packet.completionRequirements={requirePhoto,requireChecklist,jobType,source:"OfficeOS Playbook"};
  const safe={company_id:company.id,legacy_job_ref:jobRef,title:String(job.title||job.customer||"Job").slice(0,250),customer_name:String(job.customer||"").slice(0,250),customer_phone:String(job.phone||customer?.phone||"").slice(0,80),customer_email:String(job.email||customer?.email||"").slice(0,250),address:String(job.address||customer?.address||"").slice(0,500),scheduled_date:job.date||null,scheduled_time:String(job.time||"").slice(0,40),status:String(job.status||"Scheduled").slice(0,80),field_notes:String(job.notes||"").slice(0,4000),job_packet:packet,updated_at:new Date().toISOString()};
  const {data:fieldJob,error:jobError}=await service.from("field_jobs").upsert(safe,{onConflict:"company_id,legacy_job_ref"}).select("id").single();if(jobError)throw jobError;
  await service.from("field_job_assignments").delete().eq("job_id",fieldJob.id);
  const assignedIds=Array.isArray(job.assignedTeamIds)?job.assignedTeamIds:[];
  const legacyMembers=Array.isArray(cloud?.data?.teamMembers)?cloud.data.teamMembers.filter((m:any)=>assignedIds.includes(m.id)&&m.active!==false):[];
  const userIds=[...new Set(legacyMembers.map((m:any)=>m.userId).filter(Boolean))];
  let assigned=0;
  if(userIds.length){const {data:members,error:membersError}=await service.from("company_memberships").select("id,user_id").eq("company_id",company.id).in("user_id",userIds).eq("active",true);if(membersError)throw membersError;if(members?.length){const ins=await service.from("field_job_assignments").insert(members.map(m=>({job_id:fieldJob.id,membership_id:m.id})));if(ins.error)throw ins.error;assigned=members.length}}
  return json(200,{ok:true,fieldJobId:fieldJob.id,assigned,sanitized:true,completionRequirements:packet.completionRequirements});
 }catch(e){console.error(e);return json(500,{ok:false,error:e instanceof Error?e.message:"Unexpected error"})}
});
