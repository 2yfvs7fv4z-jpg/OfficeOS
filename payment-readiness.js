(function(){
'use strict';
const CARD_UNAVAILABLE='officeos_card_unavailable';
function unavailable(){return sessionStorage.getItem(CARD_UNAVAILABLE)==='1'}
function markUnavailable(){sessionStorage.setItem(CARD_UNAVAILABLE,'1')}
function renderUnavailable(){const box=document.getElementById('walletBody');if(!box)return;box.innerHTML=`<div class="pay-form"><div class="payment-note"><b>Card payments need Stripe connected.</b><div class="muted" style="margin-top:5px">Cash and check payments are available now. Card entry and saved cards will turn on after Stripe is configured for OfficeOS and this company.</div></div><div class="row wrap" style="margin-top:12px"><button class="primary" type="button" onclick="officeWalletManual('Cash')">Record Cash</button><button class="secondary" type="button" onclick="officeWalletManual('Check')">Record Check</button></div></div>`}
}
function install(){if(typeof window.officeWalletCard!=='function'||window.officeWalletCard._readinessWrapped)return false;const original=window.officeWalletCard;const wrapped=async function(){if(unavailable()){renderUnavailable();return}try{return await original.apply(this,arguments)}catch(e){const m=String(e?.message||'');if(/not configured|stripe payments|card payments/i.test(m)){markUnavailable();renderUnavailable();return}throw e}};wrapped._readinessWrapped=true;window.officeWalletCard=wrapped;return true}
const oldFetch=window.fetch.bind(window);window.fetch=async function(input,init){const url=typeof input==='string'?input:input?.url||'';const r=await oldFetch(input,init);if(url.includes('/functions/v1/officeos-customer-wallet')&&r.status===503){try{const c=r.clone();const d=await c.json();if(/not configured/i.test(String(d?.error||'')))markUnavailable()}catch{}}return r};
let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(t)},125);setTimeout(()=>{install();if(unavailable())renderUnavailable()},100);
})();