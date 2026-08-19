(function(){
'use strict';
function customerFor(name,cid){const n=String(name||'').trim().toLowerCase();return(db.customers||[]).find(x=>x.company===cid&&String(x.name||'').trim().toLowerCase()===n)||null}
function companyFor(cid){return(db.companies||[]).find(x=>x.id===cid)||null}
function record(kind,id){const map={lead:'leads',event:'events',invoice:'invoices',job:'jobs'};return(db[map[kind]]||[]).find(x=>x.id===id)||null}
function context(kind,r){const c=companyFor(r.company),cust=kind==='lead'?r:customerFor(r.customer,r.company)||{name:r.customer||'',email:r.email||'',phone:r.phone||'',address:r.address||''};return{company:c,customer:cust,record:r}}
function msgKind(kind,r){if(kind==='lead')return r.status==='New'?'lead':'followup';if(kind==='event')return'appointment';if(kind==='invoice')return'invoice';return'followup'}
function text(kind,id){const r=record(kind,id);if(!r)return alert('That record is no longer available.');const ctx=context(kind,r),phone=ctx.customer.phone||r.phone||'',message=window.officePlaybookMessage?.(msgKind(kind,r),ctx)||'';if(!phone)return alert('Add a phone number for this customer first.');if(typeof window.officeSmsCompose!=='function')return alert('OfficeOS texting is still loading.');window.officeSmsCompose({companyRef:r.company,to:phone,name:ctx.customer.name||r.customer||r.name||'',message,title:'Send Playbook Text'})}
function install(){const original=window.officeCommCompose;if(typeof original!=='function'||original.datasetPlaybookWrapped)return false;const wrapped=function(kind,id,channel){if(channel==='text')return text(kind,id);return original(kind,id,channel)};wrapped.datasetPlaybookWrapped=true;window.officeCommCompose=wrapped;return true}
let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(t)},250);
})();