import { appendFileSync } from 'fs';
const OUT = process.argv[2];
const SLUGS = ['typography','layout','buttons','tab-bars','toolbars','alerts'];
function cellText(cell){ const o=[]; (function w(n){ if(!n)return; if(Array.isArray(n))return n.forEach(w);
  if(typeof n!=='object')return; if(n.type==='text'&&n.text)o.push(n.text); if(n.code)o.push(n.code);
  for(const k of ['inlineContent','content'])if(n[k])w(n[k]); })(cell); return o.join('').trim(); }
function findTables(n,acc){ if(!n)return; if(Array.isArray(n))return n.forEach(x=>findTables(x,acc));
  if(typeof n!=='object')return; if(n.type==='table'&&n.rows)acc.push(n.rows);
  for(const k in n) if(typeof n[k]==='object') findTables(n[k],acc); }
for (const slug of SLUGS){
  const j = await (await fetch(`https://developer.apple.com/tutorials/data/design/human-interface-guidelines/${slug}.json`)).json();
  const tables=[]; findTables(j,tables);
  if(!tables.length){ console.log(`${slug}: 0 table`); continue; }
  let md = `\n\n## Tableaux (extraits DocC)\n`;
  for(const rows of tables){
    md += '\n';
    rows.forEach((row,i)=>{ md += '| ' + row.map(c=>cellText(c)||' ').join(' | ') + ' |\n';
      if(i===0) md += '|' + row.map(()=>'---').join('|') + '|\n'; });
  }
  appendFileSync(`${OUT}/${slug}.md`, md);
  console.log(`${slug}: ${tables.length} table(s) ajoutée(s)`);
}
