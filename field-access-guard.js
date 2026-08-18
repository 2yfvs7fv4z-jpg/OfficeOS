(function(){
'use strict';
const FIELD_ROLE='field';
const HIDDEN_PAGES=['dashboard','leads','calendar','more','settings'];
let originalQuickAdd=null,originalOpenForm=null;
function el(id){return document.getElementById(id)}
function member(){return window.OfficeOSField?.memberForUser?.()||null}
function isField(){return member()?.role===FIELD_ROLE}
function setHidden(node,hidden){if(!node)return;node.dataset.officeFieldGuard=hidden?'1':'';node.style.display=hidden?'none':''}
function jobsButton(){return document.querySelector('nav button[data-page="jobs"]')}
function forceJobs(){
 const jobs=el('jobs');if(!jobs)return;
 document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='jobs'));
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page==='jobs'));
 window.scrollTo({top:0,behavior:'auto'});
}
function installBanner(){
 const jobs=el('jobs');if(!jobs||el('fieldGuardBanner'))return;
 const banner=document.createElement('div');banner.id='fieldGuardBanner';banner.className='card';banner.style.cssText='margin-bottom:12px;border-left:4px solid #60a5fa';
 banner.innerHTML='<div class="row between"><div><div class="kicker">Employee Workspace</div><b>Assigned jobs only</b><div class="muted">Pricing, invoices, company settings, reports and protected office records are not available in this role.</div></div><span class="tag">Limited Access</span></div>';
 jobs.insertBefore(banner,jobs.firstChild);
}
function guardFunctions(){
 if(originalQuickAdd===null&&typeof window.quickAdd==='function')originalQuickAdd=window.quickAdd;
 if(originalOpenForm===null&&typeof window.openForm==='function')originalOpenForm=window.openForm;
 if(typeof originalQuickAdd==='function')window.quickAdd=function(){if(isField())return alert('Quick Add is not available for field employee accounts.');return originalQuickAdd.apply(this,arguments)};
 if(typeof originalOpenForm==='function')window.openForm=function(type,data){if(isField())return alert('This record can only be changed by office staff.');return originalOpenForm.apply(this,arguments)};
}
function apply(){
 const active=isField();
 document.body.classList.toggle('office-field-restricted',active);
 HIDDEN_PAGES.forEach(id=>setHidden(el(id),active));
 document.querySelectorAll('nav button').forEach(b=>setHidden(b,active&&b.dataset.page!=='jobs'));
 setHidden(el('fab'),active);
 setHidden(document.querySelector('.company-select'),active);
 setHidden(document.querySelector('.search-open'),active);
 if(active){
   installBanner();guardFunctions();forceJobs();
   const jb=jobsButton();if(jb){jb.style.display='';jb.textContent='My Day'}
 }else{
   const banner=el('fieldGuardBanner');banner?.remove();
   if(originalQuickAdd)window.quickAdd=originalQuickAdd;
   if(originalOpenForm)window.openForm=originalOpenForm;
 }
}
document.addEventListener('click',e=>{
 if(!isField())return;
 const nav=e.target.closest?.('nav button[data-page]');
 if(nav&&nav.dataset.page!=='jobs'){e.preventDefault();e.stopImmediatePropagation();forceJobs()}
},true);
window.officeApplyFieldAccess=apply;
setTimeout(apply,1500);
setInterval(()=>{if(currentUser)apply()},5000);
const oldRender=window.render;if(typeof oldRender==='function')window.render=function(){const r=oldRender.apply(this,arguments);setTimeout(apply,0);return r};
})();