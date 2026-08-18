(function(){
'use strict';
const el=id=>document.getElementById(id);
function clean(text){return String(text||'').replace(/\*\*/g,'').replace(/\s+/g,' ').trim()}
function splitItems(text){
 const t=clean(text).replace(/^Here's your daily office brief:\s*/i,'');
 const parts=t.split(/\s+(?=\d+\.\s)/).map(x=>x.replace(/^\d+\.\s*/,'').trim()).filter(Boolean);
 return parts.length>1?parts:[t];
}
function row(item){
 const m=item.match(/^([^:]{2,42}):\s*(.*)$/);
 const title=clean(m?m[1]:'Update'),body=clean(m?m[2]:item);
 const low=title.toLowerCase();
 const icon=low.includes('urgent')?'!':low.includes('invoice')?'$':low.includes('lead')?'◎':low.includes('appointment')||low.includes('schedule')?'◷':low.includes('priority')?'→':'•';
 return `<div class="brief-row"><span class="brief-icon">${icon}</span><div><b>${escapeHtml(title)}</b><div>${escapeHtml(body)}</div></div></div>`
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function formatBrief(){
 const box=el('dailyBrief');if(!box)return;
 const raw=box.dataset.rawBrief||box.textContent||'';
 if(!raw.trim()||/reviewing the business/i.test(raw))return;
 box.dataset.rawBrief=raw;
 const items=splitItems(raw).slice(0,5);
 box.innerHTML=`<div class="brief-list">${items.map(row).join('')}</div>`;
 const card=box.closest('.card');if(card)card.classList.add('daily-brief-card');
 const btn=el('officeAiBriefBtn');if(btn){btn.textContent='↻ Update';btn.classList.add('brief-refresh-btn')}
 const h=card?.querySelector('h2');if(h&&!card.querySelector('.brief-head')){const head=document.createElement('div');head.className='brief-head';h.parentNode.insertBefore(head,h);head.appendChild(h);if(btn)head.appendChild(btn)}
}
function bind(){
 const box=el('dailyBrief');if(!box)return;
 const btn=el('officeAiBriefBtn');if(btn&&!btn.dataset.polishBound){btn.dataset.polishBound='1';const original=btn.onclick;btn.onclick=async function(e){if(typeof original==='function')await original.call(this,e);setTimeout(formatBrief,80);setTimeout(formatBrief,600)}}
 const obs=new MutationObserver(()=>{if(!box.dataset.formatting){box.dataset.formatting='1';setTimeout(()=>{formatBrief();delete box.dataset.formatting},0)}});obs.observe(box,{childList:true,characterData:true,subtree:true});formatBrief();
}
setTimeout(bind,900);const oldRender=window.render;if(typeof oldRender==='function')window.render=function(){const r=oldRender.apply(this,arguments);setTimeout(bind,0);return r};
})();