(function(){
'use strict';
const el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const norm=v=>String(v??'').toLowerCase().replace(/[^a-z0-9$]+/g,' ').replace(/\s+/g,' ').trim();
const stop=new Set(['the','and','for','with','from','this','that','your','you','are','was','has','have','about','into','today','still','need','needs','open','status','marked','one','two','his','her','their','office','brief']);
function clean(text){return String(text||'').replace(/\*\*/g,'').replace(/\s+/g,' ').trim()}
function splitItems(text){
 const t=clean(text).replace(/^Here's your daily office brief:\s*/i,'').replace(/^Daily office brief:\s*/i,'');
 const numbered=t.split(/\s+(?=\d+[.)]\s)/).map(x=>x.replace(/^\d+[.)]\s*/,'').trim()).filter(Boolean);
 if(numbered.length>1)return numbered;
 const bullets=t.split(/\s+(?=[•●▪◦-]\s+)/).map(x=>x.replace(/^[•●▪◦-]\s+/,'').trim()).filter(Boolean);
 if(bullets.length>1)return bullets;
 const labels=['Urgent Task','Urgent Tasks','Open Leads','Lead Follow-ups','Invoices','Overdue Invoices','Upcoming Appointments','Appointments','Jobs','Practical Priority','Priority'];
 const pattern=new RegExp(`(?=${labels.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')}\\s*:)`,'gi');
 const labeled=t.split(pattern).map(x=>x.trim()).filter(Boolean);
 return labeled.length>1?labeled:[t];
}
function words(v){return norm(v).split(' ').filter(x=>x.length>2&&!stop.has(x))}
function recordText(type,x){if(type==='task')return x.title||'';if(type==='lead')return [x.name,x.service].filter(Boolean).join(' ');if(type==='invoice')return [x.customer,x.number,x.status].filter(Boolean).join(' ');if(type==='event')return [x.title,x.customer,x.type].filter(Boolean).join(' ');if(type==='job')return [x.title,x.customer,x.status].filter(Boolean).join(' ');return''}
function typeBoost(type,text){const t=norm(text);if(type==='task'&&/(task|urgent|call|follow up|priority)/.test(t))return 5;if(type==='lead'&&/(lead|estimate|prospect|inquiry)/.test(t))return 5;if(type==='invoice'&&/(invoice|overdue|draft|paid|payment|collect)/.test(t))return 5;if(type==='event'&&/(appointment|calendar|scheduled|schedule|upcoming|installation|estimate)/.test(t))return 5;if(type==='job'&&/(job|work|install|installation|service)/.test(t))return 4;return 0}
function score(type,x,text){const hay=norm(text),needle=norm(recordText(type,x));if(!needle)return 0;let s=typeBoost(type,text);const fields=type==='task'?[x.title]:type==='lead'?[x.name,x.service]:type==='invoice'?[x.customer,x.number]:type==='event'?[x.title,x.customer]:[x.title,x.customer];for(const f of fields){const n=norm(f);if(n&&n.length>2&&hay.includes(n))s+=12}const w=words(needle),h=new Set(words(hay));s+=w.filter(v=>h.has(v)).length*2;return s}
function label(type,x){if(type==='task')return'Open Task';if(type==='invoice')return x.customer?`View ${x.customer}`:'View Invoice';if(type==='lead')return x.name?`View ${x.name}`:'View Lead';if(type==='event')return x.customer?`View ${x.customer}`:'View Appointment';if(type==='job')return x.customer?`View ${x.customer}`:'View Job';return'View'}
function matches(item){if(typeof db==='undefined')return[];const text=clean(item),groups=[['task',db.tasks||[]],['invoice',db.invoices||[]],['lead',db.leads||[]],['event',db.events||[]],['job',db.jobs||[]]],cid=typeof current==='function'?current():'all',all=[];for(const[type,list]of groups){for(const x of list){if(cid!=='all'&&x.company!==cid)continue;const s=score(type,x,text);if(s>=7)all.push({type,id:x.id,label:label(type,x),score:s})}}all.sort((a,b)=>b.score-a.score);const out=[];for(const x of all){if(out.some(v=>v.type===x.type&&v.id===x.id))continue;out.push(x);if(out.length>=2)break}return out}
function genericTarget(item){const t=norm(item);if(/invoice|overdue|payment|collect|draft/.test(t))return{page:'more',label:'View Invoices',section:'money'};if(/lead|prospect|inquiry|estimate question/.test(t))return{page:'leads',label:'View Leads'};if(/appointment|calendar|scheduled|schedule|upcoming/.test(t))return{page:'calendar',label:'View Calendar'};if(/job|installation|install|service work/.test(t))return{page:'jobs',label:'View Jobs'};if(/task|urgent|priority|follow up|call/.test(t))return{page:'more',label:'View Tasks',section:'tasks'};return{page:'dashboard',label:'View Dashboard'}}
function row(item){const m=item.match(/^([^:]{2,42}):\s*(.*)$/),title=clean(m?m[1]:'Update'),body=clean(m?m[2]:item),low=title.toLowerCase(),icon=low.includes('urgent')?'!':low.includes('invoice')?'$':low.includes('lead')?'◎':low.includes('appointment')||low.includes('schedule')?'◷':low.includes('priority')?'→':'•',targets=matches(item);let actions='';if(targets.length){actions=`<div class="brief-actions">${targets.map(x=>`<button type="button" class="brief-action-btn" onclick="officeBriefOpen('${esc(x.type)}','${esc(x.id)}')">${esc(x.label)} <span>›</span></button>`).join('')}</div>`}else{const g=genericTarget(item);actions=`<div class="brief-actions"><button type="button" class="brief-action-btn" onclick="officeBriefGo('${g.page}','${g.section||''}')">${esc(g.label)} <span>›</span></button></div>`}return `<div class="brief-row"><span class="brief-icon">${icon}</span><div class="brief-copy"><b>${esc(title)}</b><div>${esc(body)}</div>${actions}</div></div>`}
function clickPage(page){const btn=document.querySelector(`nav button[data-page="${page}"]`);if(btn)btn.click();else{document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===page));window.scrollTo({top:0,behavior:'auto'})}}
function recordNode(id){const controls=[...document.querySelectorAll('button[onclick]')];const b=controls.find(x=>(x.getAttribute('onclick')||'').includes(id));return b?.closest('.item,.action,.card')||null}
function focusRecord(type,id){const page=type==='lead'?'leads':type==='job'?'jobs':type==='event'?'calendar':type==='invoice'?'more':'more';clickPage(page);setTimeout(()=>{if(type==='invoice'&&typeof window.officeJumpTo==='function')window.officeJumpTo('money');if(type==='task'&&typeof window.officeJumpTo==='function')window.officeJumpTo('tasks');const node=recordNode(id);if(node){node.scrollIntoView({behavior:'smooth',block:'center'});node.classList.add('brief-target-focus');setTimeout(()=>node.classList.remove('brief-target-focus'),1400)}else if(type!=='task'&&typeof window.editItem==='function')window.editItem(type,id)},180)}
window.officeBriefOpen=(type,id)=>focusRecord(type,id);
window.officeBriefGo=function(page,section=''){clickPage(page);setTimeout(()=>{if(section&&page==='more'&&typeof window.officeJumpTo==='function')window.officeJumpTo(section)},100)};
function formatBrief(){
 const box=el('dailyBrief');if(!box)return;
 const rendered=!!box.querySelector('.brief-list');
 const visible=clean(box.textContent||'');
 let raw=rendered?(box.dataset.rawBrief||visible):visible;
 if(!raw.trim()||/reviewing the business/i.test(raw))return;
 if(!rendered)box.dataset.rawBrief=raw;
 const items=splitItems(raw).filter(Boolean);
 box.innerHTML=`<div class="brief-list">${items.map(row).join('')}</div>`;
 const card=box.closest('.card');if(card)card.classList.add('daily-brief-card');
 const btn=el('officeAiBriefBtn');if(btn){btn.textContent='↻ Update';btn.classList.add('brief-refresh-btn')}
 const h=card?.querySelector('h2');if(h&&!card.querySelector('.brief-head')){const head=document.createElement('div');head.className='brief-head';h.parentNode.insertBefore(head,h);head.appendChild(h);if(btn)head.appendChild(btn)}
}
function bind(){const box=el('dailyBrief');if(!box)return;if(box.dataset.briefObserverBound!=='1'){box.dataset.briefObserverBound='1';const obs=new MutationObserver(()=>{if(box.dataset.formatting)return;const rendered=!!box.querySelector('.brief-list');if(!rendered){const incoming=clean(box.textContent||'');if(incoming&&!/reviewing the business/i.test(incoming))box.dataset.rawBrief=incoming}box.dataset.formatting='1';setTimeout(()=>{formatBrief();delete box.dataset.formatting},0)});obs.observe(box,{childList:true,characterData:true,subtree:true})}formatBrief()}
setTimeout(bind,900);const oldRender=window.render;if(typeof oldRender==='function')window.render=function(){const r=oldRender.apply(this,arguments);setTimeout(bind,0);return r};
})();