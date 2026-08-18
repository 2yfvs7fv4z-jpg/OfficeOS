(function(){
const OFFICE_JUMPS=[['money','Money'],['approvals','Approvals'],['activity','Activity'],['playbook','Playbook'],['companies','Companies'],['account','Account'],['security','Security'],['data','Data'],['settings','Settings']];
let observer=null,busy=false;
function office(){return document.getElementById('more')}
function heading(card){return String(card?.querySelector('h2')?.textContent||'').trim()}
function officeCards(){return [...document.querySelectorAll('#more .card')]}
function firstOffice(fn){return officeCards().find(fn)||null}
function ensureHeading(host,id,title,subtitle){let h=document.getElementById(id);if(h)return h;h=document.createElement('div');h.id=id;h.className='relocated-heading';h.innerHTML=`<h2>${title}</h2>${subtitle?`<div class="office-section-note">${subtitle}</div>`:''}`;host.appendChild(h);return h}
function relocate(){
 const leads=document.getElementById('leads'),dashboard=document.getElementById('dashboard');
 const customers=officeCards().find(c=>heading(c)==='Customers');if(customers&&leads&&!customers.dataset.relocated){customers.dataset.relocated='crm';customers.classList.add('relocated-card');ensureHeading(leads,'crmCustomersHeading','Customers','Customer records live with Leads & CRM.').insertAdjacentElement('afterend',customers)}
 const tasks=officeCards().find(c=>heading(c)==='Tasks');if(tasks&&dashboard&&!tasks.dataset.relocated){tasks.dataset.relocated='home';tasks.classList.add('relocated-card');const action=document.getElementById('actionCenter')?.closest('.card');if(action)action.insertAdjacentElement('afterend',tasks);else dashboard.appendChild(tasks)}
 const account=officeCards().find(c=>heading(c)==='Account'&&!c.closest('#settingsHome'));if(account&&!account.dataset.relocated){account.dataset.relocated='settings-duplicate';account.style.display='none'}
}
function officeTarget(key){if(key==='money')return firstOffice(c=>/invoice|estimate|bill|payment|finance/i.test(heading(c))||c.id==='payablesCard');if(key==='approvals')return firstOffice(c=>/^approvals$/i.test(heading(c)));if(key==='activity')return firstOffice(c=>/recent activity|activity/i.test(heading(c)));if(key==='playbook')return firstOffice(c=>/playbook/i.test(heading(c)));if(key==='companies')return firstOffice(c=>/^companies$/i.test(heading(c)));if(key==='account')return document.querySelector('#settingsHome .card');if(key==='security')return document.getElementById('officeSecurityCenter')||document.getElementById('sg-security');if(key==='data')return document.getElementById('officeImportCenter')||firstOffice(c=>heading(c)==='Data');if(key==='settings')return document.querySelector('#settingsHome .settings-shell')||document.getElementById('officeSettingsSection');return null}
function makeNav(){let nav=document.getElementById('officeJumpNav');if(nav)return nav;const page=office();if(!page)return null;nav=document.createElement('div');nav.id='officeJumpNav';nav.className='office-jump-nav';nav.setAttribute('aria-label','Office page navigation');nav.innerHTML=OFFICE_JUMPS.map(([key,text])=>`<button type="button" class="office-jump-btn" data-jump="${key}" onclick="officeJumpTo('${key}')">${text}</button>`).join('');page.querySelector('h1')?.insertAdjacentElement('afterend',nav);return nav}
function refreshNav(nav){if(!nav)return;for(const [key] of OFFICE_JUMPS){const btn=nav.querySelector(`[data-jump="${key}"]`);if(btn)btn.hidden=!officeTarget(key)}}
function jump(target,nav,key){if(!target)return;nav?.querySelectorAll('.office-jump-btn').forEach(b=>b.classList.toggle('active',b.dataset.jump===key));const y=target.getBoundingClientRect().top+window.scrollY-(nav?.offsetHeight||52)-12;window.scrollTo({top:Math.max(0,y),behavior:'smooth'});target.classList.add('office-jump-focus');setTimeout(()=>target.classList.remove('office-jump-focus'),900)}
window.officeJumpTo=function(key){const nav=document.getElementById('officeJumpNav');jump(officeTarget(key),nav,key)};
function apply(){if(busy)return;busy=true;try{relocate();const nav=makeNav();refreshNav(nav)}finally{busy=false}}
window.refreshOfficeOrganization=apply;
function install(){apply();if(observer)return;observer=new MutationObserver(()=>setTimeout(apply,0));observer.observe(document.body,{childList:true,subtree:true});document.querySelector('nav button[data-page="more"]')?.addEventListener('click',()=>setTimeout(()=>{apply();window.scrollTo({top:0,behavior:'auto'})},0))}
setTimeout(install,900);
})();