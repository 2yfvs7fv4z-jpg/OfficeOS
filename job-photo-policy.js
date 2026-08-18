(function(){
const el=id=>document.getElementById(id);
function selectedCompany(){return typeof company==='function'?company():null}
function install(){const save=[...document.querySelectorAll('#more button')].find(b=>/save playbook/i.test(b.textContent||''));if(!save||el('pbRequireCompletionPhoto'))return;const row=document.createElement('label');row.className='setting-toggle';row.style.marginTop='14px';row.innerHTML='<input id="pbRequireCompletionPhoto" type="checkbox"><span><b>Require photo before job completion</b><small>Employees must attach at least one job photo before a job can be marked Complete.</small></span>';save.insertAdjacentElement('beforebegin',row);sync()}
function sync(){const box=el('pbRequireCompletionPhoto'),c=selectedCompany();if(box)box.checked=!!c?.playbook?.requireCompletionPhoto}
const baseRenderOffice=window.renderOffice;window.renderOffice=function(){const r=baseRenderOffice.apply(this,arguments);setTimeout(()=>{install();sync()},0);return r};
const baseSave=window.savePlaybook;window.savePlaybook=function(){const c=selectedCompany(),box=el('pbRequireCompletionPhoto');if(c&&box){c.playbook=c.playbook||{};c.playbook.requireCompletionPhoto=box.checked}const r=baseSave.apply(this,arguments);if(c&&box){c.playbook=c.playbook||{};c.playbook.requireCompletionPhoto=box.checked;save()}return r};
document.getElementById('companySelect')?.addEventListener('change',()=>setTimeout(sync,0));setTimeout(()=>{install();sync()},1400);
})();