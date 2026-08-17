(function(){
'use strict';
const broken=new Map();
function handlerName(node){
 const code=node.getAttribute?.('onclick')||'';
 const m=code.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
 return m?.[1]||'';
}
function check(node){
 if(!(node instanceof HTMLElement))return;
 const name=handlerName(node);
 if(!name)return;
 const ok=typeof window[name]==='function';
 if(ok){
   broken.delete(node);
   node.removeAttribute('data-office-broken-action');
   node.removeAttribute('aria-disabled');
   return;
 }
 broken.set(node,name);
 node.dataset.officeBrokenAction=name;
 node.setAttribute('aria-disabled','true');
 console.error(`[OfficeOS] Missing click handler: ${name}`,node);
}
function scan(root=document){
 root.querySelectorAll?.('[onclick]').forEach(check);
 return [...broken.values()];
}
document.addEventListener('click',e=>{
 const node=e.target.closest?.('[data-office-broken-action]');
 if(!node)return;
 e.preventDefault();e.stopImmediatePropagation();
 const action=node.dataset.officeBrokenAction||'this action';
 alert(`OfficeOS caught a control that needs an update (${action}). It has been blocked instead of failing silently.`);
},true);
const observer=new MutationObserver(records=>{
 for(const rec of records){
   rec.addedNodes.forEach(n=>{
     if(!(n instanceof HTMLElement))return;
     check(n);scan(n);
   });
 }
});
function start(){scan();observer.observe(document.body,{childList:true,subtree:true});setTimeout(scan,1200);setTimeout(scan,3000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.OfficeOSInteractionHealth={scan,getBroken:()=>[...broken.entries()].map(([node,handler])=>({handler,text:(node.textContent||'').trim().slice(0,80)}))};
})();