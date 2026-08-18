(function(){
'use strict';
function el(id){return document.getElementById(id)}
function install(){
 const office=el('more'),settingsHome=el('settingsHome');
 if(!office||!settingsHome)return false;
 let section=el('officeSettingsSection');
 if(!section){section=document.createElement('div');section.id='officeSettingsSection';section.className='office-settings-section';section.innerHTML='<div class="relocated-heading"><h2>Settings</h2><div class="office-section-note">Account, security, AI, data, appearance and business defaults.</div></div>';office.appendChild(section)}
 if(settingsHome.parentElement!==section)section.appendChild(settingsHome);
 const standalone=el('settings');if(standalone&&standalone!==office)standalone.remove();
 const navBtn=document.querySelector('nav button[data-page="settings"]');if(navBtn)navBtn.remove();
 const nav=document.querySelector('nav');if(nav)nav.style.gridTemplateColumns='repeat(5,1fr)';
 if(db?.appSettings?.startPage==='settings'){db.appSettings.startPage='more';try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}}
 window.refreshOfficeOrganization?.();
 return true
}
let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>20)clearInterval(timer)},200);
const oldRender=window.render;if(typeof oldRender==='function')window.render=function(){const r=oldRender.apply(this,arguments);setTimeout(install,0);return r};
})();