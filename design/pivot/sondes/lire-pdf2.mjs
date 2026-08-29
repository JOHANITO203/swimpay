/* Extraire le texte d un PDF en respectant les espaces.

   La version naive joignait toutes les chaines par une espace, ce qui casse
   les mots : un PDF positionne souvent glyphe par glyphe. Ici on lit les
   tableaux « [ (a) -12 (b) ] TJ » et on n insere une espace que lorsque le
   deplacement est assez grand pour etre une vraie separation de mots.

   Le seuil est en millieme de cadratin, negatif = ecart. On le regle par
   variable d environnement pour pouvoir le CALIBRER sur une page dont on
   connait deja le texte, plutot que de le deviner. */
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const SEUIL = Number(process.env.SEUIL || -120);
const buf = readFileSync(process.argv[2]);

const flux = [];
let i = 0;
while (true) {
  const d = buf.indexOf("stream", i);
  if (d < 0) break;
  let s = d + 6;
  if (buf[s] === 0x0d) s++;
  if (buf[s] === 0x0a) s++;
  const f = buf.indexOf("endstream", s);
  if (f < 0) break;
  try { flux.push(inflateSync(buf.subarray(s, f)).toString("latin1")); } catch {}
  i = f + 9;
}

// Deshexer les chaines PDF ecrites en <...> et deproteger celles en (...).
const litChaine = (s) => s
  .replace(/\\([()\\])/g, "$1")
  .replace(/\\n/g, "\n")
  .replace(/\\r/g, "")
  .replace(/\\t/g, " ")
  .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));

const lignes = [];
for (const m of flux) {
  let sortie = "";
  // Un seul balayage : chaines, nombres de kerning, et sauts de ligne.
  const re = /\((?:\\.|[^\\()])*\)|(-?\d+(?:\.\d+)?)(?=\s*(?:\(|<))|\bT[dD*]\b|\bTJ\b|\bTj\b|\bET\b/g;
  let x;
  while ((x = re.exec(m)) !== null) {
    const t = x[0];
    if (t.startsWith("(")) {
      sortie += litChaine(t.slice(1, -1));
    } else if (x[1] !== undefined) {
      if (Number(x[1]) <= SEUIL) sortie += " ";
    } else if (t === "Td" || t === "TD" || t === "T*" || t === "ET") {
      sortie += "\n";
    }
  }
  if (sortie.trim()) lignes.push(sortie);
}

const texte = lignes.join("\n")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .split("\n").map((l) => l.trim()).filter((l) => l.length).join("\n");

if (process.argv[3]) {
  writeFileSync(process.argv[3], texte, "utf8");
  console.error(`flux=${flux.length} seuil=${SEUIL} caracteres=${texte.length} -> ${process.argv[3]}`);
} else {
  console.log(texte);
}
