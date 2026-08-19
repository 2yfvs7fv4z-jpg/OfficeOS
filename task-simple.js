(function(){
'use strict';
const escx=v=>typeof esc==='function'?esc(v):String(v??'');
function page(name){const b=document.querySelector(`nav button[data-page="${name}"]`);if(b)b.click()}
function destination(t){const s=((t?.title||'')+' '+(t?.notes||'')).toLowerCase();if(/invoice|payment|collect|balance|refund|receipt/.test(s))return'accounting';if(/lead|estimate|follow.?up|call|contact/.test(s))return'leads';if(/job|install|photo|complete|measure|service/.test(s))return'jobs';if(/schedule|appointment|calendar|meeting/.test(s))return'calendar';return'more'}
window.officeOpenTaskPage=function(id){const t=(db.tasks||[]).find(x=>x.id===id);if(!t)return;page(destination(t))};
function render(){const box=document.getElementById('taskList');if(!box)return;const a=typeof relevant==='function'?relevant(db.tasks||[]):(db.tasks||[]);box.innerHTML=a.length?a.map(t=>`<div class="item simple-task ${t.done?'good':''}"><div class="row between"><div><b>${escx(t.title||'Task')}</b>${t.dueDate?`<div class="muted">${t.done?'Done':'Due '+(typeof dateText==='function'?dateText(t.dueDate):t.dueDate)}</div>`:''}</div><span class="tag">${t.done?'Done':escx(t.priority||'Normal')}</span></div><div class="row wrap" style="margin-top:10px">${t.done?'':`<button class="secondary" onclick="officeOpenTaskPage('${t.id}')">Open</button>`}<button class="${t.done?'secondary':'primary'}" onclick="toggleTask('${t.id}')">${t.done?'Reopen':'Done'}</button></div></div>`).join(''):'<div class="empty">No tasks right now.</div>'}
window.renderSimpleTasks=render;
const old=window.renderOffice;if(typeof old==='function')window.renderOffice=function(){const r=old.apply(this,arguments);setTimeout(render,0);return r};
setTimeout(render,1200);
})();