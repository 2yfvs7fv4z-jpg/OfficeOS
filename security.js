(function(){
'use strict';
const CANONICAL='officeospro.com';
const SECURE_ORIGIN='https://officeospro.com';

function enforceOrigin(){
  const h=location.hostname.toLowerCase();
  if(h===CANONICAL && location.protocol!=='https:'){
    location.replace(SECURE_ORIGIN+location.pathname+location.search+location.hash);
    return false;
  }
  if(h==='2yfvs7fv4z-jpg.github.io' && location.pathname.startsWith('/OfficeOS')){
    const rest=location.pathname.replace(/^\/OfficeOS\/?/,'/');
    location.replace(SECURE_ORIGIN+rest+location.search+location.hash);
    return false;
  }
  return true;
}
if(!enforceOrigin())return;

try{ if(window.opener) window.opener=null; }catch{}
try{ if(window.top!==window.self) window.top.location=window.self.location.href; }catch{}

const state={lastVerifiedAt:0,verificationInterval:15*60*1000};
function hasAuth(){return typeof supabaseClient!=='undefined'&&!!supabaseClient?.auth}
async function verifySession(force=false){
  if(!hasAuth())return null;
  if(!force && Date.now()-state.lastVerifiedAt<state.verificationInterval)return true;
  try{
    const {data,error}=await supabaseClient.auth.getUser();
    state.lastVerifiedAt=Date.now();
    if(error||!data?.user){
      if(typeof handleSession==='function')await handleSession(null);
      return false;
    }
    return true;
  }catch{return false;}
}

async function requireAuthenticated(action){
  const ok=await verifySession(true);
  if(!ok){
    if(typeof authMessage==='function')authMessage('Please sign in again to continue.',true);
    document.getElementById('authGate')?.classList.remove('hidden');
    return false;
  }
  if(typeof action==='function')return action();
  return true;
}

function markSecurity(){
  const account=document.getElementById('accountEmail');
  if(account && !document.getElementById('officeSecurityStatus')){
    const badge=document.createElement('div');
    badge.id='officeSecurityStatus';
    badge.className='muted';
    badge.style.marginTop='8px';
    badge.style.fontSize='12px';
    badge.textContent=location.protocol==='https:'?'🔒 Secure connection · protected account':'⚠️ Insecure connection';
    account.insertAdjacentElement('afterend',badge);
  }
}

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')verifySession(false)});
window.addEventListener('online',()=>verifySession(true));
window.OfficeOSSecurity={verifySession,requireAuthenticated,secureOrigin:SECURE_ORIGIN};
setTimeout(()=>{markSecurity();verifySession(false)},900);
})();