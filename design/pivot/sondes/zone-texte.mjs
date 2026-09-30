/* Trouver OU un texte peut se poser sur une image, par la mesure.

   On ne juge pas une zone a l'oeil : on releve la luminance de chaque case
   d'une grille, et on calcule le contraste du PIRE pixel de la zone contre la
   couleur du texte. C'est le pire pixel qui decide de la lisibilite, pas la
   moyenne — une seule tache claire suffit a manger une lettre.

   Aucune dependance : ffmpeg sort la luma brute, Node la lit.
   usage : node zone-texte.mjs <image> [colonnes] [lignes]                   */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const IMG = resolve(process.argv[2] ?? "../assets/Mobile_money_web_hero_render_202608301958.jpeg");
const NC = Number(process.argv[3] ?? 40);
const NL = Number(process.argv[4] ?? 22);

if (!existsSync(IMG)) { console.log("Introuvable :", IMG); process.exit(1); }

/* La luma brute, en niveaux 0-255, sur une grille NC x NL. ffmpeg fait la
   moyenne des pixels de chaque case en reduisant — c'est exactement ce qu'on
   veut, sauf pour le pire pixel, qu'on obtient avec une grille plus fine. */
function luma(nc, nl) {
  const out = execFileSync("ffmpeg", [
    "-v", "error", "-i", IMG,
    "-vf", `scale=${nc}:${nl}:flags=area,format=gray`,
    "-f", "rawvideo", "-pix_fmt", "gray", "-",
  ], { maxBuffer: 1 << 26 });
  return out;
}

/* sRGB -> luminance relative (WCAG) */
const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const relL = (g) => lin(g);                 // gris : R=G=B, la formule se reduit
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const L_BLANC = 1.0;

/* grille grossiere pour la carte, grille fine pour le pire pixel */
const G = luma(NC, NL);
const FIN_C = NC * 6, FIN_L = NL * 6;
const F = luma(FIN_C, FIN_L);

const at = (buf, nc, x, y) => buf[y * nc + x];

/* ── la carte, en caracteres ──────────────────────────────────────────── */
const NIV = " .:-=+*#%@";
console.log("\nCarte de luminance —", IMG.split(/[\\/]/).pop());
console.log("(vide = noir, plein = clair ; le texte blanc a besoin de noir)\n");
for (let y = 0; y < NL; y++) {
  let l = "  ";
  for (let x = 0; x < NC; x++) {
    const g = at(G, NC, x, y);
    l += NIV[Math.min(NIV.length - 1, Math.floor(g / 256 * NIV.length))];
  }
  console.log(l);
}

/* ── contraste du blanc sur une zone, au pire pixel ───────────────────── */
function zone(nom, x0, y0, x1, y1) {           // fractions 0..1
  const a = Math.floor(x0 * FIN_C), b = Math.floor(y0 * FIN_L);
  const c = Math.ceil(x1 * FIN_C),  d = Math.ceil(y1 * FIN_L);
  let pire = 0, somme = 0, n = 0;
  for (let y = b; y < d; y++) for (let x = a; x < c; x++) {
    const g = at(F, FIN_C, x, y);
    if (g > pire) pire = g;
    somme += g; n++;
  }
  const rPire = ratio(L_BLANC, relL(pire));
  const rMoy  = ratio(L_BLANC, relL(somme / n));
  const verdict = rPire >= 4.5 ? "OK" : rPire >= 3 ? "gros texte seulement" : "ILLISIBLE";
  console.log(
    "  " + nom.padEnd(30) +
    ("pire " + pire).padEnd(10) +
    (rPire.toFixed(2) + ":1").padEnd(10) +
    ("moy " + rMoy.toFixed(1) + ":1").padEnd(13) +
    verdict
  );
  return rPire;
}

console.log("\nContraste du blanc pur, au PIRE pixel de chaque zone :\n");
console.log("  " + "zone".padEnd(30) + "luma".padEnd(10) + "contraste".padEnd(10) + "moyenne".padEnd(13) + "verdict");
zone("moitie gauche",        0,    0,    0.50, 1);
zone("colonne gauche 45 %",  0,    0,    0.45, 1);
zone("bande haute (0-22 %)", 0,    0,    1,    0.22);
zone("bande haute gauche",   0,    0,    0.55, 0.22);
zone("quart haut gauche",    0,    0,    0.45, 0.30);
zone("bas gauche",           0,    0.72, 0.45, 1);
zone("bande basse (78-100)", 0,    0.78, 1,    1);
console.log("");
/* La colonne large echoue a cause de la queue du ruban en bas a gauche. On
   cherche donc la colonne LA PLUS HAUTE qui reste noire, en la descendant
   par crans : c'est elle qui fixe la hauteur du bloc de texte. */
console.log("Jusqu'ou peut descendre une colonne de texte a gauche :\n");
for (const [l, h] of [[0.30, 0.70], [0.30, 0.64], [0.34, 0.60], [0.38, 0.56], [0.42, 0.50]]) {
  zone(`colonne ${Math.round(l * 100)} % jusqu'a ${Math.round(h * 100)} %`, 0, 0, l, h);
}
console.log("");
