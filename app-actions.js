(function(){
'use strict';
let refreshing=false;
function redrawAll(){
  try{window.render?.()}catch(e){console.error('[OfficeOS] render failed',e)}
  try{window.renderActionCenter?.()}catch(e){console.error('[OfficeOS] action center refresh failed',e)}
  try{window.renderAccounting?.()}catch(e){console.error('[OfficeOS] accounting refresh failed',e)}
  try{window.renderSettingsPage?.()}catch(e){console.error('[OfficeOS] settings refresh failed',e)}
  try{window.refreshOfficeOrganization?.()}catch(e){console.error('[OfficeOS] office organization refresh failed',e)}
}
function flashButton(btn,text,ms=900){if(!btn)return;const old=btn.dataset.officeOriginalText||btn.textContent;btn.dataset.officeOriginalText=old;btn.textContent=text;setTimeout(()=>{if(btn.isConnected){btn.textContent=old;btn.disabled=false}delete btn.dataset.officeOriginalText},ms)}
window.officeRefreshAll=async function(btn){
  if(refreshing)return;
  refreshing=true;
  const old=btn?.textContent||'Refresh';
  if(btn){btn.disabled=true;btn.textContent='Refreshing…'}
  try{
    let user=window.currentUser||null;
    if(!user&&window.supabaseClient){const {data}=await window.supabaseClient.auth.getSession();user=data?.session?.user||null}
    if(user&&typeof window.cloudLoad==='function')await window.cloudLoad(user);else redrawAll();
    redrawAll();
    if(btn){btn.textContent='Refreshed ✓';setTimeout(()=>{if(btn.isConnected){btn.textContent=old;btn.disabled=false}},1000)}
    return true;
  }catch(e){
    console.error('[OfficeOS] refresh failed',e);
    redrawAll();
    if(btn)flashButton(btn,'Try again',1200);
    alert('OfficeOS could not refresh from the cloud. Your current screen is still available.');
    return false;
  }finally{refreshing=false}
};
window.officeRefreshActionCenter=async function(btn){const ok=await window.officeRefreshAll(btn);if(ok)window.renderActionCenter?.();return ok};
function wireRefreshButtons(){document.querySelectorAll('button').forEach(btn=>{if(btn.dataset.officeRefreshBound)return;const label=(btn.textContent||'').trim().toLowerCase();if(label!=='refresh')return;btn.dataset.officeRefreshBound='1';btn.onclick=null;btn.addEventListener('click',()=>window.officeRefreshAll(btn))})}
const observer=new MutationObserver(()=>wireRefreshButtons());
function start(){wireRefreshButtons();observer.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();