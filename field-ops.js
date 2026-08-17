(function(){
const ROLE_DEFAULTS={
 owner:{label:'Owner / Admin',permissions:['*']},
 office_manager:{label:'Office Manager',permissions:['jobs.view_all','jobs.edit','jobs.assign','customers.view','customers.edit','leads.view','leads.edit','calendar.view','calendar.edit','tasks.view','tasks.edit','invoices.view','invoices.edit','approvals.manage','team.view','reports.view','files.view','files.upload']},
 sales:{label:'Sales',permissions:['jobs.view_assigned','customers.view','leads.view','leads.edit','calendar.view','calendar.edit','tasks.view','tasks.edit','estimates.view','estimates.edit','files.view','files.upload']},
 field:{label:'Field Employee / Contractor',permissions:['jobs.view_assigned','jobs.status','jobs.checklist','jobs.field_notes','files.view_assigned','files.upload_assigned']}
};
const IMPORTANT_FIELDS=new Set(['amount','price','estimate','invoice','payment','customerMaster','companySettings','playbook','permissions','billing','accounting','export','delete']);
function ensure(){
 db.teamMembers=Array.isArray(db.teamMembers)?db.teamMembers:[];
 db.jobTemplates=Array.isArray(db.jobTemplates)?db.jobTemplates:[];
 db.fieldAudit=Array.isArray(db.fieldAudit)?db.fieldAudit:[];
 for(const m of db.teamMembers){if(!Array.isArray(m.permissions))m.permissions=[];if(!Array.isArray(m.deniedPermissions))m.deniedPermissions=[];if(typeof m.active!=='boolean')m.active=true}
 for(const j of db.jobs||[]){
  if(!Array.isArray(j.assignedTeamIds))j.assignedTeamIds=[];
  if(!Array.isArray(j.fieldNotes))j.fieldNotes=[];
  if(!Array.isArray(j.jobFiles))j.jobFiles=[];
  if(!j.jobPacket||typeof j.jobPacket!=='object')j.jobPacket={templateId:'',templateName:'',sections:[],checklist:[]};
 }
}
function memberForUser(){
 ensure();
 const userId=currentUser?.id||'';
 return db.teamMembers.find(m=>m.userId===userId&&m.active!==false)||null;
}
function roleOf(member){return member?.role||'field'}
function permissions(member){
 const role=roleOf(member),base=ROLE_DEFAULTS[role]?.permissions||[];
 return new Set([...(base||[]),...(member?.permissions||[])]);
}
function can(permission,member=memberForUser()){
 if(!member)return true;
 const denied=new Set(member.deniedPermissions||[]);
 if(denied.has(permission))return false;
 const p=permissions(member);
 return p.has('*')||p.has(permission);
}
function assigned(job,member=memberForUser()){
 if(!member)return true;
 return Array.isArray(job?.assignedTeamIds)&&job.assignedTeamIds.includes(member.id);
}
function visibleJobs(member=memberForUser()){
 ensure();
 if(!member||can('jobs.view_all',member))return db.jobs||[];
 if(can('jobs.view_assigned',member))return (db.jobs||[]).filter(j=>assigned(j,member));
 return [];
}
function audit(action,job,detail=''){
 ensure();const m=memberForUser();
 db.fieldAudit.unshift({id:uid(),company:job?.company||m?.company||'',jobId:job?.id||'',memberId:m?.id||'',userId:currentUser?.id||'',action,detail,createdAt:nowISO()});
 db.fieldAudit=db.fieldAudit.slice(0,500);
}
function statusAllowed(next){return ['Scheduled','On My Way','Arrived','In Progress','Waiting','Complete'].includes(next)}
function completionRequirements(job){
 const c=(db.companies||[]).find(x=>x.id===job?.company),pb=c?.playbook||{},req=pb.fieldCompletion||{};
 const checklist=job?.jobPacket?.checklist||[];
 return{requireChecklist:req.requireChecklist===true,requireAfterPhoto:req.requireAfterPhoto===true,missingChecklist:checklist.filter(x=>x.required!==false&&!x.done).length,afterPhotos:(job?.jobFiles||[]).filter(f=>f.category==='after'||f.category==='completed').length};
}
function setStatus(jobId,next){
 const m=memberForUser(),job=(db.jobs||[]).find(j=>j.id===jobId);if(!job)throw new Error('Job not found.');
 if(m&&!assigned(job,m)&&!can('jobs.view_all',m))throw new Error('This job is not assigned to you.');
 if(!can('jobs.status',m)&&!can('jobs.edit',m))throw new Error('You do not have permission to change job status.');
 if(!statusAllowed(next))throw new Error('That status is not allowed.');
 if(next==='Complete'){
  const r=completionRequirements(job);
  if(r.requireChecklist&&r.missingChecklist)throw new Error(`${r.missingChecklist} required checklist item(s) still need completed.`);
  if(r.requireAfterPhoto&&!r.afterPhotos)throw new Error('A completed-work photo is required before closing this job.');
 }
 const old=job.status;job.status=next;job.updatedAt=nowISO();audit('job_status',job,`${old||''} → ${next}`);logActivity(job.company,`${m?.name||'Team member'} changed ${job.title||job.customer||'job'} to ${next}`);save();return job;
}
function toggleChecklist(jobId,itemId){
 const m=memberForUser(),job=(db.jobs||[]).find(j=>j.id===jobId);if(!job)throw new Error('Job not found.');
 if(m&&!assigned(job,m)&&!can('jobs.view_all',m))throw new Error('This job is not assigned to you.');
 if(!can('jobs.checklist',m)&&!can('jobs.edit',m))throw new Error('You do not have permission to update this checklist.');
 const item=(job.jobPacket?.checklist||[]).find(x=>x.id===itemId);if(!item)throw new Error('Checklist item not found.');
 item.done=!item.done;item.completedAt=item.done?nowISO():'';item.completedBy=item.done?(m?.id||''):'';job.updatedAt=nowISO();audit('checklist',job,`${item.title||'Item'}: ${item.done?'done':'reopened'}`);save();return item;
}
function addFieldNote(jobId,text){
 const m=memberForUser(),job=(db.jobs||[]).find(j=>j.id===jobId);if(!job)throw new Error('Job not found.');
 if(m&&!assigned(job,m)&&!can('jobs.view_all',m))throw new Error('This job is not assigned to you.');
 if(!can('jobs.field_notes',m)&&!can('jobs.edit',m))throw new Error('You do not have permission to add field notes.');
 const note={id:uid(),text:String(text||'').trim(),memberId:m?.id||'',memberName:m?.name||currentUser?.email||'Team member',createdAt:nowISO()};if(!note.text)throw new Error('Enter a note.');job.fieldNotes.unshift(note);job.updatedAt=nowISO();audit('field_note',job,note.text.slice(0,120));save();return note;
}
function attachFileMeta(jobId,file){
 const m=memberForUser(),job=(db.jobs||[]).find(j=>j.id===jobId);if(!job)throw new Error('Job not found.');
 if(m&&!assigned(job,m)&&!can('jobs.view_all',m))throw new Error('This job is not assigned to you.');
 if(!can('files.upload_assigned',m)&&!can('files.upload',m))throw new Error('You do not have permission to upload job files.');
 const rec={id:uid(),storagePath:file.storagePath||'',name:file.name||'Job file',type:file.type||'',category:file.category||'during',caption:file.caption||'',customerVisible:file.customerVisible===true,memberId:m?.id||'',memberName:m?.name||'',createdAt:nowISO()};job.jobFiles.unshift(rec);job.updatedAt=nowISO();audit('job_file',job,`${rec.category}: ${rec.name}`);save();return rec;
}
function protectImportantChange(field,member=memberForUser()){if(!member)return true;if(IMPORTANT_FIELDS.has(field)&&roleOf(member)!=='owner'&&roleOf(member)!=='office_manager')return false;return true}
function myDay(date=new Date().toISOString().slice(0,10)){
 const jobs=visibleJobs().filter(j=>j.date===date&&!['Complete','Cancelled'].includes(j.status));
 return [...jobs].sort((a,b)=>(a.time||'').localeCompare(b.time||''));
}
window.OfficeOSField={ROLE_DEFAULTS,memberForUser,roleOf,can,assigned,visibleJobs,myDay,setStatus,toggleChecklist,addFieldNote,attachFileMeta,completionRequirements,protectImportantChange,ensure};
ensure();
const planCss=document.createElement('link');planCss.rel='stylesheet';planCss.href='plan-entitlements.css?v=1';document.head.appendChild(planCss);
const planScript=document.createElement('script');planScript.src='plan-entitlements.js?v=1';planScript.defer=true;document.body.appendChild(planScript);
const s=document.createElement('script');s.src='field-ui.js?v=1';s.defer=true;document.body.appendChild(s);
const guard=document.createElement('script');guard.src='field-access-guard.js?v=1';guard.defer=true;document.body.appendChild(guard);
})();