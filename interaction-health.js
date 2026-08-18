(function(){
'use strict';
const broken=new Map();
function handlerName(node){const code=node.getAttribute?.('onclick')||'';const m=code.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);return m?.[1]||''}
function check(node){
 if(!(node instanceof HTMLElement))return;
 const name=handlerName(node);
 if(name){
   const ok=typeof window[name]==='function';
   if(ok){broken.delete(node);node.removeAttribute('data-office-broken-action');node.removeAttribute('aria-disabled')}
   else{broken.set(node,name);node.dataset.officeBrokenAction=name;node.setAttribute('aria-disabled','true');console.error(`[OfficeOS] Missing click handler: ${name}`,node)}
 }
 if(node.tagName==='BUTTON'&&!node.disabled){
   const hasInline=!!node.getAttribute('onclick'),hasNav=!!node.dataset.page,knownId=!!node.id,insideForm=!!node.closest('form');
   if(!hasInline&&!hasNav&&!knownId&&!insideForm&&!node.dataset.officeRefreshBound&&!node.dataset.officeBound){node.dataset.officeAudit='unverified'}else node.removeAttribute('data-office-audit');
 }
}
function scan(root=document){root.querySelectorAll?.('button,[onclick]').forEach(check);return [...broken.values()]}
document.addEventListener('click',e=>{const node=e.target.closest?.('[data-office-broken-action]');if(!node)return;e.preventDefault();e.stopImmediatePropagation();const action=node.dataset.officeBrokenAction||'this action';alert(`OfficeOS caught a control that needs an update (${action}). It has been blocked instead of failing silently.`)},true);
window.addEventListener('error',e=>{const t=e?.target;if(t instanceof HTMLElement&&t.closest?.('button'))console.error('[OfficeOS] Button action error',e.error||e.message)});
window.addEventListener('unhandledrejection',e=>console.error('[OfficeOS] Unhandled action error',e.reason));
const observer=new MutationObserver(records=>{for(const rec of records){rec.addedNodes.forEach(n=>{if(!(n instanceof HTMLElement))return;check(n);scan(n)})}});
function loadBatchImport(){if(document.querySelector('script[data-office-batch-import]'))return;const s=document.createElement('script');s.src='/batch-import.js?v=1';s.dataset.officeBatchImport='1';s.defer=true;document.body.appendChild(s)}
function loadJobPhotos(){if(!document.querySelector('link[data-office-job-photos]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/job-photos.css?v=1';l.dataset.officeJobPhotos='1';document.head.appendChild(l)}if(document.querySelector('script[data-office-job-photos]'))return;const s=document.createElement('script');s.src='/job-photos.js?v=1';s.dataset.officeJobPhotos='1';s.defer=true;document.body.appendChild(s)}
function start(){scan();observer.observe(document.body,{childList:true,subtree:true});loadBatchImport();loadJobPhotos();setTimeout(scan,1200);setTimeout(scan,3000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.OfficeOSInteractionHealth={scan,getBroken:()=>[...broken.entries()].map(([node,handler])=>({handler,text:(node.textContent||'').trim().slice(0,80)})),getUnverified:()=>[...document.querySelectorAll('button[data-office-audit="unverified"]')].map(node=>(node.textContent||'').trim().slice(0,80))};
})();