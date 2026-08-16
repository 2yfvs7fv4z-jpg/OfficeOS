import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "OfficeOS Invoices <invoices@example.com>";

function esc(v:string){return String(v||"").replace(/[&<>\"']/g,(m)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#039;"} as Record<string,string>)[m])}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"} });
  try {
    if (!RESEND_API_KEY) return Response.json({error:"Invoice email service is not configured yet."},{status:503,headers:{"Access-Control-Allow-Origin":"*"}});
    const auth=req.headers.get("authorization")||"";
    if(!auth.startsWith("Bearer ")) return Response.json({error:"Unauthorized"},{status:401,headers:{"Access-Control-Allow-Origin":"*"}});
    const body=await req.json();
    const {to,customer,company,number,dueDate,amount,lines=[],notes,paymentUrl,replyTo}=body;
    if(!to||!number||!company) return Response.json({error:"Missing required invoice fields."},{status:400,headers:{"Access-Control-Allow-Origin":"*"}});
    const rows=(Array.isArray(lines)?lines:[]).map((l:any)=>`<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb">${esc(l.description)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${Number(l.qty||0)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">$${Number(l.rate||0).toFixed(2)}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">$${(Number(l.qty||0)*Number(l.rate||0)).toFixed(2)}</td></tr>`).join("");
    const pay=paymentUrl?`<p style="margin:28px 0"><a href="${esc(paymentUrl)}" style="background:#111827;color:white;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700;display:inline-block">Pay Invoice</a></p>`:"";
    const html=`<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:680px;margin:auto;color:#111827"><h2 style="margin-bottom:4px">${esc(company)}</h2><div style="color:#6b7280">Invoice ${esc(number)}</div><hr style="border:0;border-top:1px solid #e5e7eb;margin:22px 0"><p>Hi ${esc(customer||"there")},</p><p>Here is invoice <b>${esc(number)}</b>${dueDate?` due <b>${esc(dueDate)}</b>`:""}.</p><table style="border-collapse:collapse;width:100%;margin-top:18px"><thead><tr><th style="text-align:left;padding:10px;background:#f3f4f6">Description</th><th style="text-align:right;padding:10px;background:#f3f4f6">Qty</th><th style="text-align:right;padding:10px;background:#f3f4f6">Rate</th><th style="text-align:right;padding:10px;background:#f3f4f6">Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="font-size:22px;font-weight:800;text-align:right;margin-top:18px">Total: $${Number(amount||0).toFixed(2)}</div>${pay}${notes?`<p style="color:#6b7280">${esc(notes)}</p>`:""}<p style="color:#9ca3af;font-size:12px;margin-top:30px">Sent securely from OfficeOS.</p></div>`;
    const payload:any={from:RESEND_FROM,to:[to],subject:`Invoice ${number} from ${company}`,html};
    if(replyTo)payload.reply_to=replyTo;
    const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await r.json();
    if(!r.ok)return Response.json({error:data?.message||"Email failed to send."},{status:502,headers:{"Access-Control-Allow-Origin":"*"}});
    return Response.json({ok:true,id:data.id},{headers:{"Access-Control-Allow-Origin":"*"}});
  } catch (e) {
    return Response.json({error:e instanceof Error?e.message:"Unknown error"},{status:500,headers:{"Access-Control-Allow-Origin":"*"}});
  }
});