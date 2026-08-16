const OFFICEOS_BILLING={monthly:'https://buy.stripe.com/test_dRmaEW56ldRP7Jjf15fnO00',annual:'https://buy.stripe.com/test_dRmaEWeGV4hf6Ff5qvfnO01'};
function startOfficeOSCheckout(plan){const url=OFFICEOS_BILLING[plan];if(!url)return;window.location.href=url}
function showBillingGate(){const gate=document.getElementById('billingGate');if(gate)gate.classList.remove('hidden')}
function hideBillingGate(){const gate=document.getElementById('billingGate');if(gate)gate.classList.add('hidden')}
function billingReturnMessage(){const q=new URLSearchParams(location.search);if(q.get('billing')==='success'){const note=document.getElementById('billingReturn');if(note){note.style.display='block';note.textContent='Checkout completed. OfficeOS is confirming your subscription.'}history.replaceState({},'',location.pathname)}}
document.addEventListener('DOMContentLoaded',billingReturnMessage);
/* Security note: this browser layer only presents Checkout. Production access must be granted by a server-side Supabase subscription record updated from verified Stripe webhooks. Never treat the return URL or localStorage as proof of payment. */