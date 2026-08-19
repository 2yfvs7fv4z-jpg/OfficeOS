(function(){
'use strict';
let syncing=new Set();
function hasAssigned(job){return Array.isArray(job?.assignedTeamIds)&&job.assignedTeamIds.some(id=>{const m=(db.teamMembers||[]).find(x=>x.id===id);return m&&m.active!==false&&m.userId})}
async function sync(jobId,{quiet=true}={}){if(!jobId||syncing.has(jobId)||typeof currentUser==='undefined'||!currentUser)return null;const job=(db.jobs||[]).find(j=>j.id===jobId);if(!job||!hasAssigned(job))return null;syncing.add(jobId);try{if(typeof cloudSave==='function')await cloudSave();const {data,error}=await supabaseClient.functions.invoke('officeos-sync-field-job',{body:{jobRef:jobId}});if(error)throw error;if(!data?.ok)throw new Error(data?.error||'Employee job sync failed.');return data}catch(e){console.error('[OfficeOS] employee job auto-sync',jobId,e);if(!quiet)alert('The job was saved, but the employee workspace could not be refreshed yet. '+(e?.message||''));return null}finally{syncing.delete(jobId)}}
async function syncAssignedCompany(companyId){const jobs=(db.jobs||[]).filter(j=>j.company===companyId&&hasAssigned(j)&&!['Cancelled'].includes(j.status));for(const job of jobs)await sync(job.id,{quiet:true})}
function installSaveWrapper(){if(typeof window.saveJob!=='function'||window.saveJob.__employeeAutoSync)return false;const original=window.saveJob;async function wrapped(id){const before=new Set((db.jobs||[]).map(j=>j.id));const result=await original.apply(this,arguments);let jobId=id;if(!jobId){const created=(db.jobs||[]).filter(j=>!before.has(j.id)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];jobId=created?.id||''}if(jobId)setTimeout(()=>sync(jobId,{quiet:false}),80);return result}wrapped.__employeeAutoSync=true;wrapped.__original=original;window.saveJob=wrapped;return true}
function installCompleteWrapper(){if(typeof window.completeJob!=='function'||window.completeJob.__employeeAutoSync)return false;const original=window.completeJob;function wrapped(id){const r=original.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(()=>sync(id,{quiet:true}),120));return r}wrapped.__employeeAutoSync=true;wrapped.__original=original;window.completeJob=wrapped;return true}
window.officeSyncAssignedJob=(jobId,opts)=>sync(jobId,opts||{});
window.officeSyncAssignedCompany=syncAssignedCompany;
// Job photo/completion modules replace saveJob/completeJob after initial app load.
// Re-check for several seconds so the final live handlers, not an earlier version, receive the sync wrapper.
let tries=0;const timer=setInterval(()=>{tries++;installSaveWrapper();installCompleteWrapper();if(tries>=50)clearInterval(timer)},200);
setTimeout(()=>{installSaveWrapper();installCompleteWrapper()},1800);
setTimeout(()=>{installSaveWrapper();installCompleteWrapper()},3500);
document.getElementById('companySelect')?.addEventListener('change',()=>{const id=typeof current==='function'?current():'';if(id&&id!=='all')setTimeout(()=>syncAssignedCompany(id),800)});
})();