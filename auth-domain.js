(function(){
const SITE_ORIGIN='https://officeospro.com';
const EMAIL_KEY='officeos_last_email';
function el(id){return document.getElementById(id)}
function rememberEmail(){const input=el('authEmail');if(input?.value.trim())localStorage.setItem(EMAIL_KEY,input.value.trim().toLowerCase())}
function fillEmail(){const input=el('authEmail');if(input&&!input.value){const saved=localStorage.getItem(EMAIL_KEY);if(saved)input.value=saved}}
function installPwaMeta(){
 const head=document.head;
 if(!head)return;
 const ensureMeta=(name,content)=>{let m=head.querySelector(`meta[name="${name}"]`);if(!m){m=document.createElement('meta');m.name=name;head.appendChild(m)}m.content=content};
 ensureMeta('apple-mobile-web-app-capable','yes');
 ensureMeta('apple-mobile-web-app-status-bar-style','default');
 ensureMeta('apple-mobile-web-app-title','OfficeOS');
 let icon=head.querySelector('link[rel="apple-touch-icon"]');if(!icon){icon=document.createElement('link');icon.rel='apple-touch-icon';head.appendChild(icon)}icon.href='/officeos-icon.svg?v=25';
 let manifest=head.querySelector('link[rel="manifest"]');if(manifest)manifest.href='/manifest.webmanifest?v=25';
}
async function registerServiceWorker(){
 if(!('serviceWorker'in navigator)||location.protocol!=='https:'||location.hostname!=='officeospro.com')return;
 try{
  const reg=await navigator.serviceWorker.register('/service-worker.js?v=25',{scope:'/'});
  reg.update().catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!sessionStorage.getItem('officeos-sw-reloaded')){sessionStorage.setItem('officeos-sw-reloaded','1');location.reload()}});
 }catch(e){console.warn('OfficeOS service worker unavailable',e)}
}
function installOverrides(){
 fillEmail();
 if(typeof window.officeSignIn==='function'){
  const original=window.officeSignIn;
  window.officeSignIn=async function(){rememberEmail();return original.apply(this,arguments)};
 }
 if(typeof window.officeSignUp==='function'){
  window.officeSignUp=async function(){
   const email=el('authEmail')?.value.trim(),password=el('authPassword')?.value||'';
   if(!email)return typeof authMessage==='function'?authMessage('Enter your email.',true):null;
   if(password.length<6)return typeof authMessage==='function'?authMessage('Password must be at least 6 characters.',true):null;
   rememberEmail();
   if(typeof authMessage==='function')authMessage('Creating your account...');
   const {data,error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:SITE_ORIGIN+'/'}});
   if(error)return typeof authMessage==='function'?authMessage(error.message,true):alert(error.message);
   if(typeof authMessage==='function')authMessage(data.session?'Account created.':'Account created. Check your email for the confirmation link.');
  };
 }
 window.officeResetPassword=async function(){
  const email=el('authEmail')?.value.trim();
  if(!email)return typeof authMessage==='function'?authMessage('Enter your email first.',true):null;
  rememberEmail();
  const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:SITE_ORIGIN+'/'});
  if(error)return typeof authMessage==='function'?authMessage(error.message,true):alert(error.message);
  if(typeof authMessage==='function')authMessage('Password reset email sent.');
 };
 const box=document.querySelector('#authGate .gatebox');
 if(box&&!document.getElementById('officeForgotPassword')){
  const btn=document.createElement('button');btn.id='officeForgotPassword';btn.className='secondary full';btn.style.marginTop='8px';btn.textContent='Forgot Password';btn.onclick=window.officeResetPassword;box.appendChild(btn);
 }
}
function authHealth(){
 if(!window.supabaseClient?.auth)return;
 supabaseClient.auth.getSession().then(({data})=>{if(data?.session?.user?.email)localStorage.setItem(EMAIL_KEY,data.session.user.email)}).catch(()=>{});
}
installPwaMeta();
registerServiceWorker();
setTimeout(()=>{installOverrides();authHealth()},700);
})();