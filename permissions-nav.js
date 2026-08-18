(function(){
function el(id){return document.getElementById(id)}
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
 const target=el('teamPermissionsCard');
 if(target){target.scrollIntoView({behavior:'smooth',block:'start'});target.classList.add('permissions-focus');setTimeout(()=>target.classList.remove('permissions-focus'),1200);return;}
 alert('Permissions are loading. Please try again in a moment.');
};
const style=document.createElement('style');
style.textContent='.permissions-focus{outline:3px solid rgba(59,130,246,.35);outline-offset:4px;border-radius:16px}';
document.head.appendChild(style);
setTimeout(install,1450);
})();