(function(){
'use strict';
function nav(page){const b=document.querySelector(`nav button[data-page="${page}"]`);if(b){b.click();return true}return false}
function text(x){return String(x||'').toLowerCase()}
function matchLead(task){const t=text(task.title);return(db.leads||[]).find(l=>l.company===task.company&&(t.includes(text(l.name))||t.includes(text(l.service))))||null}
function matchInvoice(task){const t=text(task.title);return(db.invoices||[]).find(i=>i.company===task.company&&i.type==='Invoice'&&(t.includes(text(i.customer))||(i.number&&t.includes(text(i.number)))))||null}
function matchJob(task){const t=text(task.title);return(db.jobs||[]).find(j=>j.company===task.company&&(t.includes(text(j.customer))||t.includes(text(j.title))))||null}
function matchCustomer(task){const t=text(task.title);return(db.customers||[]).find(c=>c.company===task.company&&t.includes(text(c.name)))||null}
function focusRecord(id){setTimeout(()=>{const btn=[...document.querySelectorAll('button[onclick]')].find(b=>(b.getAttribute('onclick')||'').includes(`'${id}'`));const node=btn?.closest('.item,.invoice-card,.action');if(node){node.scrollIntoView({behavior:'smooth',block:'center'});node.classList.add('brief-target-focus');setTimeout(()=>node.classList.remove('brief-target-focus'),1400)}},180)}
window.officeTaskGo=function(id){const t=(db.tasks||[]).find(x=>x.id===id);if(!t)return;const title=text(t.title),inv=matchInvoice(t),lead=matchLead(t),job=matchJob(t),cust=matchCustomer(t);
 if(inv||/invoice|payment|collect|paid|balance|billing/.test(title)){nav('more');setTimeout(()=>{window.officeJumpTo?.('money');if(inv)focusRecord(inv.id)},120);return}
 if(lead||/lead|estimate|quote|follow.?up|call|contact/.test(title)){nav('leads');if(lead)focusRecord(lead.id);return}
 if(job||/job|install|service|work order|complete|photo/.test(title)){nav('jobs');if(job)focusRecord(job.id);return}
 if(/schedule|appointment|calendar|tomorrow|today/.test(title)){nav('calendar');return}
 if(cust){nav('more');setTimeout(()=>{window.officeJumpTo?.('customers');focusRecord(cust.id)},120);return}
 nav('more');setTimeout(()=>window.officeJumpTo?.('tasks'),120)
};
const originalConvert=window.convertLead;
window.convertLead=function(id){const l=(db.leads||[]).find(x=>x.id===id);if(!l)return originalConvert?.(id);const j={id:uid(),company:l.company,title:l.service||'Job',customer:l.name,status:'Scheduled',date:'',time:'',address:l.address||'',amount:Number(l.value||0),notes:l.notes||'',leadId:l.id,createdAt:nowISO(),updatedAt:nowISO()};db.jobs.push(j);l.status='Won';l.updatedAt=nowISO();if(!db.customers.some(c=>c.company===l.company&&String(c.name||'').toLowerCase()===String(l.name||'').toLowerCase()))db.customers.push({id:uid(),company:l.company,name:l.name,phone:l.phone||'',email:l.email||'',address:l.address||'',notes:'Converted from lead',createdAt:nowISO(),updatedAt:nowISO()});logActivity(l.company,`Booked ${l.name} as a job`);save();nav('jobs');setTimeout(()=>openForm('job',j),120)};
function decorateTasks(){document.querySelectorAll('#taskList .item').forEach(row=>{if(row.dataset.smartTask)return;const btn=[...row.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('toggleTask('));const m=(btn?.getAttribute('onclick')||'').match(/toggleTask\('([^']+)'\)/);if(!m)return;row.dataset.smartTask='1';const go=document.createElement('button');go.className='secondary';go.textContent='Open';go.onclick=()=>window.officeTaskGo(m[1]);btn?.parentElement?.insertBefore(go,btn)})}
setTimeout(decorateTasks,1200);new MutationObserver(()=>setTimeout(decorateTasks,20)).observe(document.body,{childList:true,subtree:true});
})();