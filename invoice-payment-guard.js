(function(){
'use strict';
function invoice(id){return(db.invoices||[]).find(x=>x.id===id&&String(x.type||'Invoice')==='Invoice')||null}
function take(id){const inv=invoice(id);if(!inv)return;if(typeof window.officeTakePayment==='function')return window.officeTakePayment(id);alert('Payment tools are still loading. Try again in a moment.')}
window.markPaid=function(id){return take(id)};
function clean(){document.querySelectorAll('#invoiceList .invoice-card').forEach(card=>{const buttons=[...card.querySelectorAll('button')];for(const b of buttons){const code=b.getAttribute('onclick')||'';if(/markPaid\(/.test(code)){const m=code.match(/markPaid\('([^']+)'\)/);if(!m)continue;b.textContent='Take Payment';b.className='success';b.onclick=()=>take(m[1]);b.removeAttribute('onclick')}}});document.querySelectorAll('#actionCenter button').forEach(b=>{if((b.textContent||'').trim()==='Mark Paid')b.textContent='Take Payment'})}
setTimeout(clean,2100);new MutationObserver(()=>setTimeout(clean,20)).observe(document.body,{childList:true,subtree:true});
})();