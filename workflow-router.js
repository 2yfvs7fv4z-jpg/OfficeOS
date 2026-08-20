(function(){
'use strict';
function nav(page){const b=document.querySelector(`nav button[data-page="${page}"]`);if(b){b.click();window.scrollTo({top:0,behavior:'smooth'});return true}return false}
function text(x){return String(x||'').toLowerCase()}
window.officeTaskGo=function(id){const t=(db.tasks||[]).find(x=>x.id===id);if(!t)return;const title=text(t.title);
 if(/invoice|payment|collect|paid|balance|billing/.test(title)){nav('accounting');return}
 if(/lead|estimate|quote|follow.?up|call|contact/.test(title)){nav('leads');return}
 if(/job|install|service|work order|complete|photo/.test(title)){nav('jobs');return}
 if(/schedule|appointment|calendar|tomorrow|today/.test(title)){nav('calendar');return}
 nav('more');setTimeout(()=>window.officeJumpTo?.('customers'),80)
};
const originalConvert=window.convertLead;
window.convertLead=function(id){const l=(db.leads||[]).find(x=>x.id===id);if(!l)return originalConvert?.(id);const j={id:uid(),company:l.company,title:l.service||'Job',customer:l.name,status:'Scheduled',date:'',time:'',address:l.address||'',amount:Number(l.value||0),notes:l.notes||'',leadId:l.id,createdAt:nowISO(),updatedAt:nowISO()};db.jobs.push(j);l.status='Won';l.updatedAt=nowISO();if(!db.customers.some(c=>c.company===l.company&&String(c.name||'').toLowerCase()===String(l.name||'').toLowerCase()))db.customers.push({id:uid(),company:l.company,name:l.name,phone:l.phone||'',email:l.email||'',address:l.address||'',notes:'Converted from lead',createdAt:nowISO(),updatedAt:nowISO()});logActivity(l.company,`Booked ${l.name} as a job`);save();nav('jobs')};
function decorateTasks(){document.querySelectorAll('#taskList .item').forEach(row=>{if(row.dataset.simpleTask)return;const done=[...row.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('toggleTask('));const m=(done?.getAttribute('onclick')||'').match(/toggleTask\('([^']+)'\)/);if(!m)return;row.dataset.simpleTask='1';row.querySelectorAll('button').forEach(b=>{if(b!==done&&/edit|delete|open/i.test(b.textContent||''))b.style.display='none'});const go=document.createElement('button');go.className='secondary';go.textContent='Open';go.onclick=()=>window.officeTaskGo(m[1]);done?.parentElement?.insertBefore(go,done);if(done)done.textContent=done.textContent.toLowerCase().includes('reopen')?'Reopen':'Done'})}
setTimeout(decorateTasks,900);new MutationObserver(()=>setTimeout(decorateTasks,20)).observe(document.body,{childList:true,subtree:true});
})();