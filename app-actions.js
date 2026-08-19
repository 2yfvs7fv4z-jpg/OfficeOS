(function(){
'use strict';
let refreshing=false;
function redrawAll(){
  try{window.render?.()}catch(e){console.error('[OfficeOS] render failed',e)}
  try{window.renderActionCenter?.()}catch(e){console.error('[OfficeOS] action center refresh failed',e)}
  try{window.renderAccounting?.()}catch(e){console.error('[OfficeOS] accounting refresh failed',e)}
  try{window.renderSettingsPage?.()}catch(e){console.error('[OfficeOS] settings refresh failed',e)}
  try{window.renderCommunications?.()}catch(e){console.error('[OfficeOS] communications refresh failed',e)}
  try{window.refreshOfficeOrganization?.()}catch(e){console.error('[OfficeOS] office organization refresh failed',e)}
}
function flashButton(btn,text,ms=900){if(!btn)return;const old=btn.dataset.officeOriginalText||btn.textContent;btn.dataset.officeOriginalText=old;btn.textContent=text;setTimeout(()=>{if(btn.isConnected){btn.textContent=old;btn.disabled=false}delete btn.dataset.officeOriginalText},ms)}
window.officeRefreshAll=async function(btn){if(refreshing)return;refreshing=true;const old=btn?.textContent||'Refresh';if(btn){btn.disabled=true;btn.textContent='Refreshing…'}try{let user=window.currentUser||null;if(!user&&window.supabaseClient){const {data}=await window.supabaseClient.auth.getSession();user=data?.session?.user||null}if(user&&typeof window.cloudLoad==='function')await window.cloudLoad(user);else redrawAll();redrawAll();if(btn){btn.textContent='Refreshed ✓';setTimeout(()=>{if(btn.isConnected){btn.textContent=old;btn.disabled=false}},1000)}return true}catch(e){console.error('[OfficeOS] refresh failed',e);redrawAll();if(btn)flashButton(btn,'Try again',1200);alert('OfficeOS could not refresh from the cloud. Your current screen is still available.');return false}finally{refreshing=false}};
window.officeRefreshActionCenter=async function(btn){const ok=await window.officeRefreshAll(btn);if(ok)window.renderActionCenter?.();return ok};
function wireRefreshButtons(){document.querySelectorAll('button').forEach(btn=>{if(btn.dataset.officeRefreshBound)return;const label=(btn.textContent||'').trim().toLowerCase();if(label!=='refresh')return;btn.dataset.officeRefreshBound='1';btn.onclick=null;btn.addEventListener('click',()=>window.officeRefreshAll(btn))})}
function loadScript(src,key){if(document.querySelector(`script[data-office-${key}]`))return;const s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute(`data-office-${key}`,'1');document.body.appendChild(s)}
function loadFieldSync(){loadScript('/field-job-auto-sync.js?v=2','field-sync')}
function loadCommunications(){if(!document.querySelector('link[data-office-communications]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/communications.css?v=1';l.dataset.officeCommunications='1';document.head.appendChild(l)}loadScript('/communications.js?v=2','communications');setTimeout(()=>loadScript('/playbook-communications.js?v=1','playbook-communications'),350)}
function loadEstimates(){loadScript('/estimates.js?v=1','estimates')}
function loadPayments(){loadScript('/payment-reconciliation.js?v=1','payments')}
function loadCustomerRequests(){loadScript('/customer-request-admin.js?v=1','customer-requests');setTimeout(()=>loadScript('/customer-request-texting.js?v=1','customer-request-texting'),250)}
function loadSms(){loadScript('/office-sms.js?v=1','sms')}
function loadAiBible(){loadScript('/playbook-ai.js?v=1','playbook-ai')}
const observer=new MutationObserver(()=>wireRefreshButtons());
function start(){wireRefreshButtons();observer.observe(document.body,{childList:true,subtree:true});setTimeout(loadSms,650);setTimeout(loadAiBible,850);setTimeout(loadCommunications,1100);setTimeout(loadEstimates,1350);setTimeout(loadPayments,1550);setTimeout(loadCustomerRequests,1700);setTimeout(loadFieldSync,1900)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();