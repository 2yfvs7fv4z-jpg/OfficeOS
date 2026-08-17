(function(){
const AI_ENDPOINT='https://bowrytgqbunodtmzvabp.supabase.co/functions/v1/officeos-ai-assistant';
function el(id){return document.getElementById(id)}
function companyContext(){const c=typeof company==='function'?company():null;return c?{id:c.id,name:c.name}:{id:'all',name:'All Companies'}}
function addMessage(role,text){const box=el('officeAiMessages');if(!box)return;const d=document.createElement('div');d.className='office-ai-msg '+role;d.textContent=text;box.appendChild(d);box.scrollTop=box.scrollHeight}
function setBusy(v){const b=el('officeAiSend');if(b){b.disabled=v;b.textContent=v?'Working…':'Send'}const input=el('officeAiInput');if(input)input.disabled=v}
function errorMessage(data,status){const msg=typeof data?.error==='string'?data.error:data?.error?.message;if(msg)return msg;if(status===401)return 'Your session expired. Please sign in again.';return 'AI request failed.'}
async function ask(){
 const input=el('officeAiInput'),q=input?.value.trim();if(!q)return;
 input.value='';addMessage('user',q);setBusy(true);
 try{
  const {data:{session},error:sessionError}=await supabaseClient.auth.getSession();
  if(sessionError||!session?.access_token)throw new Error('Please sign in to use OfficeOS AI.');
  const r=await fetch(AI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':SUPABASE_KEY},body:JSON.stringify({message:q,companyId:typeof current==='function'?current():companyContext().id})});
  let data={};try{data=await r.json()}catch(e){}
  if(!r.ok)throw new Error(errorMessage(data,r.status));
  const reply=(data.reply||data.message||'').trim();
  if(!reply)throw new Error('OfficeOS AI returned an empty response.');
  addMessage('assistant',reply);
  if(Array.isArray(data.followUpQuestions)&&data.followUpQuestions.length){
   const box=el('officeAiMessages');
   if(box){const wrap=document.createElement('div');wrap.className='office-ai-chips';for(const text of data.followUpQuestions.slice(0,3)){const b=document.createElement('button');b.textContent=text;b.onclick=()=>{const i=el('officeAiInput');if(i){i.value=text;ask()}};wrap.appendChild(b)}box.appendChild(wrap);box.scrollTop=box.scrollHeight}
  }
 }catch(e){addMessage('assistant','I couldn’t reach OfficeOS AI. '+(e?.message||'Please try again.'))}
 finally{setBusy(false);el('officeAiInput')?.focus()}
}
window.officeAiAsk=ask;
function open(){el('officeAiGate')?.classList.add('show');setTimeout(()=>el('officeAiInput')?.focus(),50)}
function close(){el('officeAiGate')?.classList.remove('show')}
window.openOfficeAI=open;window.closeOfficeAI=close;
function install(){
 if(el('officeAiGate'))return;
 const fab=document.createElement('button');fab.className='ai-fab';fab.setAttribute('aria-label','OfficeOS AI');fab.innerHTML='✦';fab.onclick=open;document.body.appendChild(fab);
 const gate=document.createElement('div');gate.id='officeAiGate';gate.className='office-ai-gate';gate.innerHTML=`<div class="office-ai-panel"><div class="office-ai-head"><div><b>OfficeOS AI</b><div class="muted">Your live business copilot.</div></div><button class="secondary" onclick="closeOfficeAI()">Close</button></div><div id="officeAiMessages" class="office-ai-messages"><div class="office-ai-msg assistant">I can read your live OfficeOS data and help you understand leads, jobs, customers, schedules, tasks, invoices, approvals, and what needs attention. I won’t change business records without an approval workflow.</div></div><div class="office-ai-chips"><button onclick="document.getElementById('officeAiInput').value='What needs my attention today?';officeAiAsk()">What needs me?</button><button onclick="document.getElementById('officeAiInput').value='Show me overdue invoices and what I should do next';officeAiAsk()">Overdue invoices</button><button onclick="document.getElementById('officeAiInput').value='Which leads need a follow-up?';officeAiAsk()">Lead follow-ups</button></div><div class="office-ai-compose"><textarea id="officeAiInput" rows="2" placeholder="Ask OfficeOS about your business…"></textarea><button id="officeAiSend" class="primary" onclick="officeAiAsk()">Send</button></div></div>`;
 gate.addEventListener('click',e=>{if(e.target===gate)close()});document.body.appendChild(gate);
 el('officeAiInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}})
}
setTimeout(install,500);
})();