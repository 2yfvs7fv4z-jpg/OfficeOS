(function(){
function el(id){return document.getElementById(id)}
function loadOfficeTabs(){
 if(!document.querySelector('link[data-office-tabs]')){const l=document.createElement('link');l.rel='stylesheet';l.href='office-tabs.css?v=1';l.dataset.officeTabs='1';document.head.appendChild(l)}
 if(!document.querySelector('script[data-office-tabs]')){const s=document.createElement('script');s.src='office-tabs.js?v=1';s.dataset.officeTabs='1';document.body.appendChild(s)}
}
function install(){
 if(el('permissionsQuickCard'))return;
 const office=el('more');
 if(!office)return;
 const card=document.createElement('div');
 card.id='permissionsQuickCard';
 card.className='card';
 card.innerHTML=`<div class="section-title"><div><div class="kicker">Access Control</div><h2>Permissions</h2></div></div><p class="muted">Control what office staff, sales users, and field employees are allowed to see and change.</p><button class="primary full" onclick="openOfficePermissions()">Manage Permissions</button>`;
 const first=office.querySelector('.card');
 if(first)first.insertAdjacentElement('afterend',card);else office.prepend(card);
}
window.openOfficePermissions=function(){
 if(typeof window.officeShowTab==='function')window.officeShowTab('team');
 const target=el('teamPermissionsCard');
 if(target){setTimeout(()=>{target.scrollIntoView({behavior:'smooth',block:'start'});target.classList.add('permissions-focus');setTimeout(()=>target.classList.remove('permissions-focus'),1200)},40);return;}
 alert('Permissions are loading. Please try again in a moment.');
};
const style=document.createElement('style');
style.textContent='.permissions-focus{outline:3px solid rgba(59,130,246,.35);outline-offset:4px;border-radius:16px}';
document.head.appendChild(style);
loadOfficeTabs();setTimeout(install,1450);
})();