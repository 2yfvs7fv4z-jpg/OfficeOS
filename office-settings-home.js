(function(){
'use strict';
function el(id){return document.getElementById(id)}
function ensure(){
 if(!el('settings')&&typeof window.renderSettingsPage==='function')window.renderSettingsPage();
 const page=el('settings'),nav=document.querySelector('nav');if(!page||!nav)return false;
 let btn=nav.querySelector('button[data-page="settings"]');
 if(!btn){btn=document.createElement('button');btn.dataset.page='settings';btn.innerHTML='<span class="icon">⚙</span>Settings';nav.appendChild(btn);btn.addEventListener('click',()=>{document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));page.classList.add('active');btn.classList.add('active');window.scrollTo({top:0,behavior:'auto'});window.renderSettingsPage?.();setTimeout(organize,0)})}
 nav.style.gridTemplateColumns='repeat(6,1fr)';
 let host=el('settingsOrganized');if(!host){host=document.createElement('div');host.id='settingsOrganized';el('settingsHome')?.insertAdjacentElement('afterend',host)}
 let companyCard=el('companyWorkflowSettings');if(!companyCard){companyCard=document.createElement('div');companyCard.id='companyWorkflowSettings';companyCard.className='card relocated-card';companyCard.innerHTML='<div class="kicker">Company Workflow</div><h2>Jobs & Automation</h2><p class="muted">Rules for job completion, field photos and automatic invoicing for the selected company.</p><div id="companyWorkflowSettingsBody"></div>';host?.appendChild(companyCard)}
 const body=el('companyWorkflowSettingsBody');for(const id of ['pbPhotoPolicy','pbCompletionInvoicePolicy']){const x=el(id);if(x&&body&&x.parentElement!==body)body.appendChild(x)}
 window.refreshOfficeOrganization?.();return true
}
function organize(){ensure()}
let tries=0;const timer=setInterval(()=>{tries++;if(ensure()&&tries>8)clearInterval(timer);if(tries>30)clearInterval(timer)},250);
const observer=new MutationObserver(()=>setTimeout(organize,0));setTimeout(()=>observer.observe(document.body,{childList:true,subtree:true}),700);
})();