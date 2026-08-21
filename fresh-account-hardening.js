(function(){
'use strict';
const el=id=>document.getElementById(id);
let setupSaving=false;
async function persistNow(){
 if(typeof cloudSave!=='function'||!currentUser)throw new Error('Your account is still connecting. Try again in a moment.');
 const started=Date.now();while(typeof saving!=='undefined'&&saving&&Date.now()-started<8000)await new Promise(r=>setTimeout(r,100));
 await cloudSave(currentUser);
 const badge=el('syncBadge');if(badge?.classList.contains('bad'))throw new Error('OfficeOS saved this device, but cloud sync needs attention. Tap Sync Now before leaving this device.');
}
function install(){
 if(typeof window.finishSetup!=='function'||window.finishSetup.__freshHardened)return;
 const hardened=async function(){
  if(setupSaving)return;
  const name=el('setupName')?.value.trim();if(!name)return alert('Enter your business name.');
  setupSaving=true;const btn=el('setupGate')?.querySelector('button.primary');const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Saving…'}
  try{
   let c=typeof company==='function'?company():null;
   if(!c||current()==='all'){
    const n=uid();c={id:n,name,playbook:{}};if(!db.companies.length)db.companies=[c];else db.companies.push(c);db.currentCompany=n;
   }else c.name=name;
   c.playbook={services:el('setupServices').value.trim(),hours:el('setupHours').value.trim(),area:el('setupArea').value.trim(),schedule:el('setupSchedule').value.trim(),payment:el('setupPayment').value.trim(),auto:el('setupAuto').value.trim(),approval:el('setupApproval').value.trim()};
   db.setupComplete=true;logActivity(c.id,'Saved business setup');localStorage.setItem(KEY,JSON.stringify(db));render();await persistNow();hideSetup();
  }catch(e){console.error('[OfficeOS setup]',e);alert(e?.message||'Business setup could not be saved. Please try again.');}
  finally{setupSaving=false;if(btn){btn.disabled=false;btn.textContent=old||'Save Business Setup'}}
 };
 hardened.__freshHardened=true;window.finishSetup=hardened;
}
install();
})();