// Aspire les pages HIG d'Apple (endpoint JSON DocC) et extrait le texte lisible.
import { writeFileSync, mkdirSync } from 'fs';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

const PAGES = [
  // Fondations
  'layout','typography','color','dark-mode','materials','motion','icons',
  'app-icons','sf-symbols','accessibility','charting-data',
  // Composants — présentation & contenu
  'buttons','text-fields','search-fields','lists-and-tables','collections',
  'labels','image-views','cards-and-tiles',
  // Navigation
  'tab-bars','navigation-bars','toolbars','sidebars','path-controls',
  // Sélection & entrées
  'segmented-controls','toggles','sliders','steppers','pickers','menus',
  // Présentation modale & feedback
  'alerts','action-sheets','sheets','popovers','progress-indicators',
  'notifications','widgets','gauges',
];

function walk(node, out) {
  if (node == null) return;
  if (Array.isArray(node)) { for (const n of node) walk(n, out); return; }
  if (typeof node !== 'object') return;
  if (node.type === 'heading' && node.text) out.push('\n## ' + node.text + '\n');
  if (node.type === 'text' && typeof node.text === 'string') out.push(node.text);
  if (node.type === 'codeVoice' && node.code) out.push('`' + node.code + '`');
  if (node.type === 'paragraph') { walk(node.inlineContent, out); out.push('\n\n'); }
  else if (node.type === 'listItem') { out.push('- '); walk(node.content, out); }
  else if (node.type === 'unorderedList' || node.type === 'orderedList') { walk(node.items, out); out.push('\n'); }
  else if (node.type === 'termList') { walk(node.items, out); }
  else if (node.type === 'row' || node.type === 'tabNavigator') { walk(node.columns ?? node.tabs, out); }
  else {
    for (const k of ['primaryContentSections','sections','content','inlineContent','items','columns','tabs','term','definition']) {
      if (node[k]) walk(node[k], out);
    }
  }
}

const numbers = [];
let ok = 0, ko = 0;
for (const slug of PAGES) {
  const url = `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/${slug}.json`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    const out = [];
    out.push(`# HIG — ${j.metadata?.title ?? slug}\n`);
    if (j.abstract) { walk(j.abstract, out); out.push('\n'); }
    walk(j.primaryContentSections, out);
    let text = out.join('').replace(/\n{3,}/g, '\n\n').trim();
    writeFileSync(`${OUT}/${slug}.md`, text + '\n');
    // lignes chiffrées pour la distillation
    for (const line of text.split('\n')) {
      if (/\b\d+\s?(pt|px|point|:1)\b|at least|minimum|no more than/i.test(line) && line.length < 400) {
        numbers.push(`[${slug}] ${line.trim()}`);
      }
    }
    ok++; console.log(`OK  ${slug} (${text.length} ch)`);
  } catch (e) { ko++; console.log(`KO  ${slug} — ${e.message}`); }
}
writeFileSync(`${OUT}/_numbers.md`, numbers.join('\n') + '\n');
console.log(`\nDONE ok=${ok} ko=${ko}`);
