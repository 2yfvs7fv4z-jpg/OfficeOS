(function(){
'use strict';
function el(id){return document.getElementById(id)}
function ensureSettingsVisible(){
  if(typeof window.renderSettingsPage==='function')window.renderSettingsPage();
  const page=el('settings'),nav=document.querySelector('nav');
  if(!page||!nav)return false;
  let btn=nav.querySelector('button[data-page="settings"]');
  if(!btn){
    btn=document.createElement('button');
    btn.dataset.page='settings';
    btn.innerHTML='<span class="icon">⚙</span>Settings';
    nav.appendChild(btn);
  }
  if(!btn.dataset.officeBound){
    btn.dataset.officeBound='1';
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
      page.classList.add('active');btn.classList.add('active');
      window.renderSettingsPage?.();
      window.refreshOfficeOrganization?.();
      window.scrollTo({top:0,behavior:'auto'});
    });
  }
  const oldOfficeSection=el('officeSettingsSection');if(oldOfficeSection)oldOfficeSection.remove();
  nav.style.gridTemplateColumns='repeat(6,minmax(0,1fr))';
  return true;
}
function loadPayroll(){
  if(document.querySelector('script[data-office-payroll]'))return;
  const s=document.createElement('script');s.src='payroll.js?v=1';s.dataset.officePayroll='1';document.body.appendChild(s);
}
let tries=0;const timer=setInterval(()=>{tries++;if(ensureSettingsVisible()||tries>30){if(tries>30||el('settings'))clearInterval(timer)}},200);
setTimeout(loadPayroll,900);
const baseRender=window.render;if(typeof baseRender==='function')window.render=function(){const r=baseRender.apply(this,arguments);setTimeout(ensureSettingsVisible,0);return r};
})();