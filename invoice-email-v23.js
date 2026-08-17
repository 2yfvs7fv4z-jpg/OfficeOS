(function(){
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim())}
function emailPayload(x){
  const rawLines=Array.isArray(x.lines)?x.lines:[];
  const subtotal=rawLines.reduce((a,l)=>a+Number(l.qty||0)*Number(l.rate||0),0);
  const recipientEmail=String(x.email||'').trim();
  const businessName=companyName(x.company);
  const normalizedLines=rawLines.map(l=>({description:String(l.description||''),qty:Number(l.qty||0),rate:Number(l.rate||0)}));
  const lineItems=normalizedLines.map(l=>({description:l.description,quantity:Number(l.qty||0),unitPrice:Number(l.rate||0),rate:Number(l.rate||0),amount:Number(l.qty||0)*Number(l.rate||0)}));
  const fallbackPaymentUrl='https://2yfvs7fv4z-jpg.github.io/OfficeOS/payment-pending.html';
  const paymentUrl=String(x.paymentUrl||'').trim()||fallbackPaymentUrl;
  return{to:recipientEmail,recipientEmail,customer:x.customer,customerName:x.customer,company:businessName,businessName,number:x.number,invoiceNumber:x.number,issueDate:x.issueDate,dueDate:x.dueDate,subtotal:Number(subtotal),taxRate:Number(x.taxRate||0),amount:Number(x.amount||0),total:Number(x.amount||0),lines:normalizedLines,lineItems,notes:x.notes||'',paymentUrl,replyTo:currentUser?.email||''}
}
function markInvoiceSent(x,emailId=''){x.status='Sent';x.sentAt=nowISO();x.lastSentAt=x.sentAt;x.sendCount=Number(x.sendCount||0)+1;if(emailId)x.emailId=emailId;x.updatedAt=nowISO();logActivity(x.company,`Sent professional invoice ${x.number||''} to ${x.email}`);save()}
async function directSend(payload){const {data:sessionData}=await supabaseClient.auth.getSession();const token=sessionData?.session?.access_token;if(!token)throw new Error('Your OfficeOS session expired. Sign out and back in, then try again.');const url=`${SUPABASE_URL}/functions/v1/send-invoice`;let response;try{response=await fetch(url,{method:'POST',mode:'cors',cache:'no-store',headers:{'Authorization':`Bearer ${token}`,'apikey':SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)})}catch(err){throw new Error('OfficeOS could not reach the invoice email service.');}let data=null;try{data=await response.json()}catch(_){}if(!response.ok)throw new Error(data?.error||data?.message||`Invoice email service returned ${response.status}.`);if(!data?.ok&&!data?.success)throw new Error(data?.error||'The invoice email was rejected.');return data}
window.emailInvoice=async function(i){
  const x=db.invoices.find(v=>v.id===i);if(!x)return{ok:false,error:'Invoice not found.'};
  const recipient=String(x.email||'').trim();
  if(!recipient){alert('Add the customer email to this invoice first.');return{ok:false,error:'Customer email is missing.'}}
  if(!validEmail(recipient)){alert('That customer email address does not look valid. Please edit the invoice and check it.');return{ok:false,error:'Customer email is invalid.'}}
  if(!Array.isArray(x.lines)||!x.lines.length){alert('Add at least one line item before sending this invoice.');return{ok:false,error:'Invoice has no line items.'}}
  if(!(Number(x.amount)>0)){alert('The invoice total must be greater than $0 before sending.');return{ok:false,error:'Invoice total must be greater than $0.'}}
  const btn=typeof event!=='undefined'?event?.currentTarget:null;if(btn){btn.disabled=true;btn.textContent='Sending…'}
  try{const payload=emailPayload(x);const data=await directSend(payload);markInvoiceSent(x,data.id||data.emailId||'');alert(`Invoice ${x.number||''} was sent successfully to ${recipient}.`);return{ok:true,data}}
  catch(e){console.error('OfficeOS invoice email failed.',e);const msg=e instanceof Error?e.message:String(e||'Unknown error');alert(`Invoice was NOT sent. ${msg}`);return{ok:false,error:msg}}
  finally{if(btn){btn.disabled=false;btn.textContent='Send'}}
}
})();