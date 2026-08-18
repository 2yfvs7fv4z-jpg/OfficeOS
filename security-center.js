(function(){
'use strict';
const SITE='https://officeospro.com/';
const REMEMBER_KEY='officeos_remember_device';
const SESSION_ONLY_KEY='officeos_session_only';
const LAST_VERIFY_KEY='officeos_last_session_verify';
const el=id=>document.getElementById(id);
function remembered(){return localStorage.getItem(REMEMBER_KEY)!=='0'}
function stamp(){const raw=localStorage.getItem(LAST_VERIFY_KEY);if(!raw)return'Not checked yet';const d=new Date(raw);return Number.isNaN(d.getTime())?'Not checked yet':d.toLocaleString()}
function hasAuth(){return typeof supabaseClient!=='undefined'&&!!supabaseClient?.auth}
function statusMarkup(){return `<div class="card" id="officeSecurityCenter"><div class="row between"><div><div class="kicker">Security Center</div><h2>Account & Device</h2></div><span class="sync ok">Protected</span></div><div class="item"><div class="row between"><div><b>Secure connection</b><div class="muted">${location.protocol==='https:'?'HTTPS is active on officeospro.com':'This connection is not secure'}</div></div><span>${location.protocol==='https:'?'🔒':'⚠️'}</span></div></div><div class="item"><div class="row between"><div><b>Remember this device</b><div class="muted">${remembered()?'This trusted device can keep you signed in.':'This device uses a temporary sign-in.'}</div></div><span class="tag">${remembered()?'On':'Off'}</span></div></div><div class="item"><b>Session verification</b><div class="muted">Last checked: <span id="officeLastVerify">${stamp()}</span></div><div id="officeVerifyResult" class="muted" style="margin-top:6px"></div></div><button id="officeVerifyButton" class="secondary full" onclick="officeVerifySessionNow()">Verify My Session</button><button class="secondary full" style="margin-top:8px" onclick="officeSendPasswordReset()">Send Password Reset Email</button><button class="danger full" style="margin-top:8px" onclick="officeForgetThisDevice()">Forget This Device</button><p class="muted" style="margin-top:10px">For shared or public devices, turn off “Remember me” at sign-in or use Forget This Device when finished.</p></div>`}
function install(){
 if(el('officeSecurityCenter'))return;
 const settingsHost=el('settingsOrganized')||el('settingsHome');
 if(settingsHost){settingsHost.insertAdjacentHTML('afterbegin',statusMarkup());return;}
 const more=el('more');if(!more)return;
 const account=[...more.querySelectorAll('.card')].find(c=>c.querySelector('h2')?.textContent.trim()==='Account');
 if(account)account.insertAdjacentHTML('afterend',statusMarkup());else more.insertAdjacentHTML('afterbegin',statusMarkup())
}
window.officeVerifySessionNow=async function(){
 const btn=el('officeVerifyButton'),result=el('officeVerifyResult');
 if(!hasAuth()){
  if(result){result.textContent='Security check is unavailable. Refresh OfficeOS and try again.';result.style.color='#b91c1c'}
  return;
 }
 if(btn){btn.disabled=true;btn.textContent='Verifying…'}
 if(result){result.textContent='Checking your secure session…';result.style.color=''}
 try{
  const {data,error}=await supabaseClient.auth.getUser();
  if(error||!data?.user)throw error||new Error('Session expired');
  const now=new Date().toISOString();
  localStorage.setItem(LAST_VERIFY_KEY,now);
  const label=el('officeLastVerify');if(label)label.textContent=new Date(now).toLocaleString();
  if(result){result.textContent=`✓ Session verified for ${data.user.email||'this account'}.`;result.style.color='#166534'}
 }catch(e){
  if(result){result.textContent='Session expired. Please sign in again.';result.style.color='#b91c1c'}
  try{await supabaseClient.auth.signOut({scope:'local'})}catch{}
  el('authGate')?.classList.remove('hidden');
 }finally{
  if(btn){btn.disabled=false;btn.textContent='Verify My Session'}
 }
}
window.officeForgetThisDevice=async function(){if(!confirm('Forget this device and sign out? You will need to enter your password next time.'))return;localStorage.setItem(REMEMBER_KEY,'0');localStorage.removeItem('officeos_last_email');localStorage.removeItem(SESSION_ONLY_KEY);sessionStorage.clear();if(hasAuth()){try{await supabaseClient.auth.signOut({scope:'local'})}catch{}}location.replace(SITE)}
window.officeSendPasswordReset=async function(){const email=(typeof currentUser!=='undefined'&&currentUser?.email)||el('accountEmail')?.textContent?.trim();if(!email||!email.includes('@'))return alert('Sign in first.');if(!hasAuth())return alert('Password reset is unavailable. Refresh OfficeOS and try again.');const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:SITE});if(error)return alert(error.message);alert(`Password reset email sent to ${email}.`)}
const originalSecurity=window.OfficeOSSecurity?.verifySession;
if(originalSecurity){window.OfficeOSSecurity.verifySession=async function(force){const result=await originalSecurity(force);if(result){localStorage.setItem(LAST_VERIFY_KEY,new Date().toISOString());const label=el('officeLastVerify');if(label)label.textContent=stamp()}return result}}
setTimeout(install,1100);
const oldRender=window.render;if(typeof oldRender==='function')window.render=function(){const r=oldRender.apply(this,arguments);setTimeout(install,0);return r};
})();