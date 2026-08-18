(function(){
const JUMPS=[
  ['overview','Overview'],
  ['money','Money'],
  ['business','Business'],
  ['account','Account']
];
let observer=null,busy=false;
function office(){return document.getElementById('more')}
function heading(card){return String(card?.querySelector('h2')?.textContent||'').trim()}
function cards(){return [...document.querySelectorAll('#more .card')]}
function cardByHeading(text){return cards().find(c=>heading(c)===text)||null}
function firstMatching(fn){return cards().find(fn)||null}
function ensureHeading(host,id,title,subtitle){let h=document.getElementById(id);if(h)return h;h=document.createElement('div');h.id=id;h.className='relocated-heading';h.innerHTML=`<h2>${title}</h2>${subtitle?`<div class="office-section-note">${subtitle}</div>`:''}`;host.appendChild(h);return h}
function relocate(){
  const leads=document.getElementById('leads'),dashboard=document.getElementById('dashboard');
  const customers=cardByHeading('Customers');
  if(customers&&leads&&!customers.dataset.relocated){customers.dataset.relocated='crm';customers.classList.add('relocated-card');ensureHeading(leads,'crmCustomersHeading','Customers','Customer records live with Leads & CRM.').insertAdjacentElement('afterend',customers)}
  const tasks=cardByHeading('Tasks');
  if(tasks&&dashboard&&!tasks.dataset.relocated){tasks.dataset.relocated='home';tasks.classList.add('relocated-card');const action=document.getElementById('actionCenter')?.closest('.card');if(action)action.insertAdjacentElement('afterend',tasks);else dashboard.appendChild(tasks)}
}
function targetFor(key){
  if(key==='overview')return firstMatching(c=>!c.dataset.relocated);
  if(key==='money')return firstMatching(c=>/invoice|estimate|bill|payment|finance/i.test(heading(c))||c.id==='payablesCard');
  if(key==='business')return firstMatching(c=>/playbook|companies|data|template/i.test(heading(c)));
  if(key==='account')return firstMatching(c=>/account|security|device/i.test(heading(c))||/security/i.test(c.id||''));
  return null;
}
function ensureNav(){const o=office();if(!o)return null;let nav=document.getElementById('officeJumpNav');if(nav)return nav;nav=document.createElement('div');nav.id='officeJumpNav';nav.className='office-jump-nav';nav.setAttribute('aria-label','Office page navigation');nav.innerHTML=JUMPS.map(([key,label])=>`<button type="button" class="office-jump-btn" data-jump="${key}" onclick="officeJumpTo('${key}')">${label}</button>`).join('');o.querySelector('h1')?.insertAdjacentElement('afterend',nav);return nav}
function refreshButtons(){const nav=ensureNav();if(!nav)return;nav.querySelectorAll('[data-jump]').forEach(btn=>{const target=targetFor(btn.dataset.jump);btn.hidden=!target})}
window.officeJumpTo=function(key){const target=targetFor(key);if(!target)return;document.querySelectorAll('#officeJumpNav .office-jump-btn').forEach(b=>b.classList.toggle('active',b.dataset.jump===key));const nav=document.getElementById('officeJumpNav');const y=target.getBoundingClientRect().top+window.scrollY-(nav?.offsetHeight||52)-12;window.scrollTo({top:Math.max(0,y),behavior:'smooth'});target.classList.add('office-jump-focus');setTimeout(()=>target.classList.remove('office-jump-focus'),900)};
function apply(){if(busy)return;busy=true;try{relocate();ensureNav();refreshButtons()}finally{busy=false}}
function install(){apply();if(observer)return;observer=new MutationObserver(()=>setTimeout(apply,0));observer.observe(document.body,{childList:true,subtree:true});document.querySelector('nav button[data-page="more"]')?.addEventListener('click',()=>setTimeout(()=>{apply();window.scrollTo({top:0,behavior:'auto'})},0))}
setTimeout(install,900);
})();