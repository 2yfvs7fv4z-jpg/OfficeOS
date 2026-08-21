import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const skip=new Set(['node_modules','.git']);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{if(skip.has(e.name))return[];const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p]})}
const files=walk(root).filter(f=>/\.(?:html|js|css|webmanifest)$/.test(f));
const text=new Map(files.map(f=>[path.relative(root,f),fs.readFileSync(f,'utf8')]));
const failures=[],warnings=[];
const fail=(name,detail)=>failures.push({name,detail});
const warn=(name,detail)=>warnings.push({name,detail});

const required=['index.html','app.js','app-actions.js','workflow-router.js','estimates.js','estimate-job-handoff.js','job-photos.js','job-completion-invoice.js','invoice-pro.js','invoice-email-v23.js','payment-reconciliation.js','payment-auto-sync.js','payment-guards.js','invoice-payment-guard.js','payment-success.js','payment-success-hooks.js','office-sms.js','office-email.js','employee-workspace.js','employee-workspace.css','team-access.js','field-status-pull.js','dispatch.js','service-worker.js'];
for(const f of required)if(!text.has(f))fail('required-file',`${f} is missing`);

const all=[...text.entries()].map(([f,s])=>`\n/* ${f} */\n${s}`).join('\n');
const badUrls=['2yfvs7fv4z-jpg.github.io/OfficeOS'];
for(const u of badUrls)if(all.includes(u))fail('legacy-production-url',`Found old production URL: ${u}`);
if(/buy\.stripe\.com\/test_/i.test(all))fail('test-billing-link','Stripe test Checkout link is still present in the launch build');
if(/TEST MODE/i.test(text.get('index.html')||''))fail('test-mode-ui','Visible TEST MODE copy is still present in index.html');

for(const [f,s] of text){
  if(/\bTODO\b|\bFIXME\b/i.test(s))warn('todo',`${f} contains TODO/FIXME`);
  if(/coming soon/i.test(s))warn('coming-soon',`${f} contains “coming soon”`);
  if(/not implemented/i.test(s))fail('not-implemented',`${f} contains “not implemented”`);
  if(/Mark Paid/.test(s)&&f!=='invoice-payment-guard.js')warn('legacy-mark-paid',`${f} still contains Mark Paid copy; verify it routes through Take Payment`);
}

const index=text.get('index.html')||'';
if(/name=["']robots["'][^>]+noindex/i.test(index))warn('search-indexing','App shell is still noindex. Keep intentionally for authenticated app, but launch needs a separate indexable public/marketing surface.');
const srcs=[...index.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]).filter(x=>!/^https?:\/\//.test(x)).map(x=>x.split('?')[0].replace(/^\//,''));
for(const src of srcs)if(src&&!text.has(src))fail('missing-script',`index.html loads ${src}, but the file is missing`);

const appActions=text.get('app-actions.js')||'';
for(const src of [...appActions.matchAll(/loadScript\(['"]([^'"]+)/g)].map(m=>m[1].split('?')[0].replace(/^\//,''))){if(src&&!text.has(src))fail('missing-dynamic-script',`app-actions.js loads ${src}, but the file is missing`)}
if(!/office-email\.js/.test(appActions))fail('customer-email-loader','Unified OfficeOS email layer is not loaded by app-actions.js');

const emailJs=text.get('office-email.js')||'';
if(!/officeos-send-email/.test(emailJs))fail('customer-email-endpoint','OfficeOS customer email layer is not wired to the authenticated email endpoint');
if(!/officeCommCompose/.test(emailJs)||!/_officeUnified/.test(emailJs))fail('communications-email-override','Unified communications no longer overrides legacy email handoff');
if(!/officeSmsCompose/.test(emailJs))fail('customer-text-integration','Customer quick contact no longer routes texting through OfficeOS');

const sw=text.get('service-worker.js')||'';
const shellMatch=sw.match(/const SHELL=\[(.*?)\];/s);
if(!shellMatch)fail('service-worker','Could not find SHELL asset list');
else{
  const assets=[...shellMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(x=>x!=='/').map(x=>x.replace(/^\//,''));
  for(const a of assets)if(a&&!text.has(a))fail('missing-cache-asset',`service-worker caches ${a}, but the file is missing`);
  for(const must of ['app-actions.js','estimate-job-handoff.js','field-status-pull.js','payment-guards.js','invoice-payment-guard.js','payment-success.js','office-email.js','office-sms.js','employee-workspace.js','employee-workspace.css'])if(!assets.includes(must))fail('uncached-launch-code',`${must} is not in the PWA shell`);
}

const navPages=[...index.matchAll(/<button[^>]+data-page=["']([^"']+)["']/gi)].map(m=>m[1]);
const sectionPages=[...index.matchAll(/<section[^>]+id=["']([^"']+)["'][^>]*class=["'][^"']*\bpage\b/gi)].map(m=>m[1]);
for(const p of navPages)if(!sectionPages.includes(p))fail('broken-nav-target',`Navigation points to ${p}, but no matching page section exists`);
const navRefs=[...all.matchAll(/nav\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]);
for(const p of new Set(navRefs))if(!navPages.includes(p))fail('broken-runtime-nav',`Runtime navigation targets ${p}, but no bottom-nav button exists`);

const employeeJs=text.get('employee-workspace.js')||'';
const employeeCss=text.get('employee-workspace.css')||'';
if(!/owned\.data\?\.length/.test(employeeJs))fail('employee-owner-bypass','Employee workspace no longer explicitly bypasses company owners');
if(!/\['field','sales'\]/.test(employeeJs))fail('employee-role-gate','Employee workspace role gate for field/sales is missing or changed');
if(!/company_memberships/.test(employeeJs)||!(/active['"],?true|\.eq\(['"]active['"],true\)/.test(employeeJs)))warn('employee-active-membership','Review employee membership query to ensure only active memberships enable limited access');
for(const selector of ['>header','>main','>nav','>#fab','.ai-fab'])if(!employeeCss.includes(selector))fail('employee-ui-isolation',`employee-workspace.css no longer hides owner UI selector ${selector}`);
if(!/Limited Access/.test(employeeJs))warn('employee-limited-label','Employee workspace no longer displays a Limited Access cue');
if(!/assigned jobs/i.test(text.get('team-access.js')||''))warn('team-access-copy','Team Access no longer clearly states assigned-job-only field access');

const onclicks=[...all.matchAll(/onclick=["'][^"']*?\b([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
const builtins=new Set(['alert','confirm','prompt','open','close','print']);
const unique=[...new Set(onclicks)].filter(n=>!builtins.has(n));
for(const fn of unique){const def=new RegExp(`(?:function\\s+${fn}\\s*\\(|(?:window\\.)?${fn}\\s*=|window\\[['\"]${fn}['\"]\\]\\s*=)`);if(!def.test(all))fail('missing-ui-handler',`${fn}() is referenced by inline UI but no definition was found`)}

console.log(`OfficeOS launch QA scanned ${files.length} UI files.`);
for(const w of warnings)console.warn(`WARN [${w.name}] ${w.detail}`);
if(failures.length){for(const x of failures)console.error(`FAIL [${x.name}] ${x.detail}`);console.error(`\n${failures.length} launch-blocking QA issue(s), ${warnings.length} warning(s).`);process.exit(1)}
console.log(`PASS: 0 launch-blocking static QA issues; ${warnings.length} warning(s) require review.`);
