(function(){
'use strict';
const el=id=>document.getElementById(id);
async function persistSetup(){
  if(!currentUser)throw new Error('Please sign in again before saving your business.');
  localStorage.setItem(KEY,JSON.stringify(db));
  const payload={data:db,updated_at:nowISO()};
  let result;
  if(cloudRowId){
    result=await supabaseClient.from('officeos_data').update(payload).eq('id',cloudRowId).eq('user_id',currentUser.id).select('id,data').single();
  }else{
    result=await supabaseClient.from('officeos_data').insert({user_id:currentUser.id,...payload}).select('id,data').single();
    if(result.data?.id)cloudRowId=result.data.id;
  }
  if(result.error)throw result.error;
  if(!result.data?.data?.setupComplete)throw new Error('OfficeOS could not verify your business setup in the cloud.');
  return result.data;
}
window.finishSetup=async function(){
  const name=el('setupName')?.value.trim();
  if(!name)return alert('Enter your business name.');
  const btn=el('setupGate')?.querySelector('button.primary');
  const old=btn?.textContent||'Save Business Setup';
  if(btn){btn.disabled=true;btn.textContent='Saving securely…'}
  try{
    let c=company();
    if(!c||current()==='all'){
      const n=uid();
      c={id:n,name,playbook:{}};
      if(!db.companies.length)db.companies=[c];else db.companies.push(c);
      db.currentCompany=n;
    }else c.name=name;
    c.playbook={
      services:el('setupServices')?.value.trim()||'',hours:el('setupHours')?.value.trim()||'',area:el('setupArea')?.value.trim()||'',schedule:el('setupSchedule')?.value.trim()||'',payment:el('setupPayment')?.value.trim()||'',auto:el('setupAuto')?.value.trim()||'',approval:el('setupApproval')?.value.trim()||''
    };
    db.setupComplete=true;
    logActivity(c.id,'Saved business setup');
    render();
    setSync('Saving…');
    await persistSetup();
    setSync('Cloud synced','ok');
    hideSetup();
  }catch(e){
    console.error('[OfficeOS onboarding save]',e);
    setSync('Saved locally','bad');
    alert((e&&e.message)||'OfficeOS could not save your business setup to the cloud. Your setup is still open so you can try again.');
  }finally{
    if(btn){btn.disabled=false;btn.textContent=old}
  }
};
})();