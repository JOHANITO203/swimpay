/* Le profil de mouvement d'une video, mesure image par image.

   Deux courbes, et elles disent des choses differentes :
     — le MOUVEMENT : la difference moyenne entre une image et la precedente.
       C'est elle qui montre ou tombe le temps fort, et si la fin s'immobilise.
     — la LUMIERE : la luminance moyenne. Sur nos rendus, c'est elle qui dit
       quand l'acide s'allume.
   Plus le nombre de coupes : une boucle propre n'en a qu'une, ou zero.

   ffmpeg seul, aucune dependance. Sortie JSON sur la sortie standard.
   usage : node profil-motion.mjs <fichier.mp4> [pas_images]                 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const F = resolve(process.argv[2] ?? "");
const PAS = Number(process.argv[3] ?? 2);
if (!existsSync(F)) { console.error("Introuvable : " + F); process.exit(1); }

const info = execFileSync("ffprobe", [
  "-v", "error", "-select_streams", "v:0",
  "-show_entries", "stream=width,height,r_frame_rate,nb_frames",
  "-show_entries", "format=duration,size", "-of", "json", F,
], { encoding: "utf8" });
const j = JSON.parse(info);
const st = j.streams[0], fm = j.format;
const [num, den] = String(st.r_frame_rate).split("/").map(Number);
const fps = num / (den || 1);
const nb = Number(st.nb_frames) || 0;
const duree = Number(fm.duration) || nb / fps;

/* ffmpeg imprime une metadonnee par image ; on la recolte telle quelle. */
function serie(filtre) {
  const out = execFileSync("ffmpeg", [
    "-v", "error", "-i", F,
    "-vf", filtre + ",signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-",
    "-f", "null", "-",
  ], { encoding: "utf8", maxBuffer: 1 << 28 });
  return [...out.matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
}

/* La LUMIERE : luminance moyenne, image par image. */
const lum = serie("scale=96:-2");
/* Le MOUVEMENT : tblend en mode difference rend l'ecart avec l'image
   precedente ; sa luminance moyenne EST la quantite de mouvement. */
const mou = serie("scale=96:-2,format=gray,tblend=all_mode=difference");

/* Les coupes : le detecteur de changement de plan de ffmpeg. */
const coupes = [...execFileSync("ffmpeg", [
  "-hide_banner", "-i", F, "-vf", "select='gt(scene,0.25)',showinfo", "-f", "null", "-",
], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  .toString().matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));

const ech = (a) => a.filter((_, i) => i % PAS === 0).map((v) => Number(v.toFixed(2)));
const maxi = (a) => a.reduce((m, v, i) => (v > a[m] ? i : m), 0);

const res = {
  fichier: F.split(/[\\/]/).pop(),
  largeur: st.width, hauteur: st.height,
  fps: Number(fps.toFixed(2)),
  images: nb,
  duree: Number(duree.toFixed(2)),
  poids_ko: Math.round(Number(fm.size) / 1024),
  coupes,
  pas_s: Number((PAS / fps).toFixed(3)),
  lumiere: ech(lum),
  mouvement: ech(mou),
  /* les deux instants qui comptent : le pic de mouvement (le temps fort) et
     le pic de lumiere (quand l'acide s'allume) */
  pic_mouvement_s: Number((maxi(mou) / fps).toFixed(2)),
  pic_lumiere_s: Number((maxi(lum) / fps).toFixed(2)),
  /* la queue : mouvement moyen sur le dernier cinquieme, rapporte au maximum.
     Proche de zero, la video se pose ; eleve, elle ne s'arrete jamais. */
  queue: Number((
    mou.slice(Math.floor(mou.length * 0.8)).reduce((s, v) => s + v, 0)
    / Math.max(1, mou.length - Math.floor(mou.length * 0.8))
    / Math.max(1e-6, Math.max(...mou))
  ).toFixed(3)),
};

console.log(JSON.stringify(res));
