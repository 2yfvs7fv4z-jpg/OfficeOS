(function(){
const TAB_LABELS={overview:'Overview',money:'Money',team:'Team',business:'Business'};
let activeTab='overview',observer=null,busy=false;
function office(){return document.getElementById('more')}
function heading(card){return String(card?.querySelector('h2')?.textContent||'').trim()}
function cardByHeading(text){return [...document.querySelectorAll('#more .card')].find(c=>heading(c)===text)||null}
function ensureHeading(host,id,title,subtitle){let h=document.getElementById(id);if(h)return h;h=document.createElement('div');h.id=id;h.className='relocated-heading';h.innerHTML=`<h2>${title}</h2>${subtitle?`<div class="office-section-note">${subtitle}</div>`:''}`;host.appendChild(h);return h}
function relocate(){
 const leads=document.getElementById('leads'),dashboard=document.getElementById('dashboard'),settingsHome=document.getElementById('settingsHome');
 const customers=cardByHeading('Customers');if(customers&&leads&&!customers.dataset.relocated){customers.dataset.relocated='crm';customers.classList.add('relocated-card');ensureHeading(leads,'crmCustomersHeading','Customers','Customer records live with Leads & CRM.').insertAdjacentElement('afterend',customers)}
 const tasks=cardByHeading('Tasks');if(tasks&&dashboard&&!tasks.dataset.relocated){tasks.dataset.relocated='home';tasks.classList.add('relocated-card');const action=document.getElementById('actionCenter')?.closest('.card');if(action)action.insertAdjacentElement('afterend',tasks);else dashboard.appendChild(tasks)}
 const account=cardByHeading('Account');if(account&&settingsHome&&!account.dataset.relocated){account.dataset.relocated='settings';account.style.display='none'}
}
function category(card){
 const id=card.id||'',h=heading(card).toLowerCase();
 if(id==='permissionsOverviewCard'||id==='teamPermissionsCard'||h.includes('team')||h.includes('permission'))return'team';
 if(id==='payablesCard'||h.includes('invoice')||h.includes('estimate')||h.includes('bill')||h.includes('payment')||h.includes('finance'))return'money';
 if(id==='jobTemplateLibrary'||h.includes('playbook')||h==='companies'||h==='data'||h.includes('template'))return'business';
 if(h==='approvals'||h.includes('activity')||h.includes('plan'))return'overview';
 return'overview';
}
function ensureNav(){const o=office();if(!o)return null;let nav=document.getElementById('officeSubnav');if(nav)return nav;nav=document.createElement('div');nav.id='officeSubnav';nav.className='office-subnav';nav.setAttribute('role','tablist');nav.innerHTML=Object.entries(TAB_LABELS).map(([k,v])=>`<button class="secondary ${k===activeTab?'active':''}" data-office-tab="${k}" onclick="officeShowTab('${k}')">${v}</button>`).join('');const title=o.querySelector('h1');title?.insertAdjacentElement('afterend',nav);return nav}
function apply(){if(busy)return;busy=true;try{relocate();ensureNav();const o=office();if(!o)return;[...o.children].forEach(node=>{if(!node.classList?.contains('card'))return;if(node.dataset.relocated)return;node.dataset.officeTab=category(node);node.classList.toggle('office-panel-hidden',node.dataset.officeTab!==activeTab)});document.querySelectorAll('#officeSubnav button').forEach(b=>b.classList.toggle('active',b.dataset.officeTab===activeTab))}finally{busy=false}}
window.officeShowTab=function(tab){if(!TAB_LABELS[tab])return;activeTab=tab;apply();window.scrollTo({top:0,behavior:'auto'})}
function install(){apply();if(observer)return;observer=new MutationObserver(()=>setTimeout(apply,0));observer.observe(document.body,{childList:true,subtree:true});const officeBtn=document.querySelector('nav button[data-page="more"]');officeBtn?.addEventListener('click',()=>setTimeout(apply,0));const leadsBtn=document.querySelector('nav button[data-page="leads"]');leadsBtn?.addEventListener('click',()=>setTimeout(relocate,0));const homeBtn=document.querySelector('nav button[data-page="dashboard"]');homeBtn?.addEventListener('click',()=>setTimeout(relocate,0))}
setTimeout(install,1600);
})();