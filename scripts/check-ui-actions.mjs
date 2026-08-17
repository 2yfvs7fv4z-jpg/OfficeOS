import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const files=fs.readdirSync(root).filter(f=>f.endsWith('.js')||f.endsWith('.html'));
const sources=files.map(f=>({file:f,text:fs.readFileSync(path.join(root,f),'utf8')}));
const all=sources.map(x=>x.text).join('\n');
const defined=new Set();
for(const m of all.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g))defined.add(m[1]);
for(const m of all.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g))defined.add(m[1]);
for(const m of all.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g))defined.add(m[1]);

const calls=[];
for(const {file,text} of sources){
  for(const m of text.matchAll(/onclick\s*=\s*["'`]\s*([A-Za-z_$][\w$]*)\s*\(/g))calls.push({file,name:m[1]});
}
const ignored=new Set(['alert','confirm','prompt','open','close','print']);
const missing=[...new Map(calls.filter(x=>!defined.has(x.name)&&!ignored.has(x.name)).map(x=>[`${x.file}:${x.name}`,x])).values()];
if(missing.length){
  console.error('Broken OfficeOS UI action contract(s):');
  for(const x of missing)console.error(` - ${x.file}: ${x.name}() is referenced by onclick but no global implementation was found`);
  process.exit(1);
}
console.log(`OfficeOS UI action check passed: ${calls.length} inline actions resolved across ${files.length} files.`);
