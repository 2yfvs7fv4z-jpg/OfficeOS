(function(){
'use strict';
const busy={saved:false,terminal:false};
function balance(){const ctx=window.officeWalletCurrent?.();if(!ctx?.invoice)return 0;return typeof window.officeInvoiceBalance==='function'?Number(window.officeInvoiceBalance(ctx.invoice)||0):Math.max(0,Number(ctx.invoice.balanceDue??ctx.invoice.amount||0))}
function amountFrom(id,fallback){const el=document.getElementById(id),n=Number(el?.value||fallback||0);return Number.isFinite(n)?n:0}
function disableSaved(v){document.querySelectorAll('#walletSavedCards button').forEach(b=>b.disabled=v)}
function disableTerminal(v){document.querySelectorAll('.terminal-reader').forEach(b=>b.disabled=v);const input=document.getElementById('terminalAmount');if(input)input.disabled=v}
function installSaved(){const fn=window.officeWalletCharge;if(typeof fn!=='function'||fn.__officeGuarded)return false;async function wrapped(paymentMethodId){if(busy.saved)return;const bal=balance(),amt=amountFrom('walletCardAmount',bal);if(amt<=0)return alert('Enter a payment amount.');if(amt>bal+0.01)return alert(`Payment cannot exceed the ${money(bal)} balance.`);busy.saved=true;disableSaved(true);try{return await fn.apply(this,arguments)}finally{busy.saved=false;disableSaved(false)}}wrapped.__officeGuarded=true;window.officeWalletCharge=wrapped;return true}
function installTerminal(){const fn=window.officeTerminalCharge;if(typeof fn!=='function'||fn.__officeGuarded)return false;async function wrapped(readerId){if(busy.terminal)return;const bal=balance(),amt=amountFrom('terminalAmount',bal);if(amt<=0)return alert('Enter an amount to charge.');if(amt>bal+0.01)return alert(`Payment cannot exceed the ${money(bal)} balance.`);busy.terminal=true;disableTerminal(true);try{return await fn.apply(this,arguments)}finally{setTimeout(()=>{busy.terminal=false;disableTerminal(false)},1200)}}wrapped.__officeGuarded=true;window.officeTerminalCharge=wrapped;return true}
let tries=0;const timer=setInterval(()=>{tries++;installSaved();installTerminal();if(tries>40)clearInterval(timer)},200);
setTimeout(()=>{installSaved();installTerminal()},2200);
})();