/* ─── LA TOILE ───
   Lue telle quelle par site.py : ce fichier n'est jamais interpolé, donc ses
   accolades et ses apostrophes n'ont rien à craindre.

   Les nœuds sont posés dans le DOM par ce script à partir de TOILE_NOEUDS,
   que site.py injecte juste au-dessus. */
(() => {
  "use strict";
  const svg = document.getElementById("t-svg");
  if (!svg || typeof TOILE_NOEUDS === "undefined") return;

  const N = TOILE_NOEUDS;
  const CX = 500, CY = 330, RX = 352, RY = 232;
  const NS = "http://www.w3.org/2000/svg";
  const el = (t, a) => {
    const e = document.createElementNS(NS, t);
    for (const k in a) e.setAttribute(k, a[k]);
    return e;
  };
  const $$ = (id) => document.getElementById(id);

  /* Une ellipse, pas un cercle : le cadre est large, et un cercle y laisserait
     deux gros vides sur les côtés. */
  const pts = N.map((_, i) => {
    const a = -Math.PI / 2 + (i / N.length) * Math.PI * 2;
    return { a, x: CX + Math.cos(a) * RX, y: CY + Math.sin(a) * RY };
  });

  const gR = $$("t-rayons"), gN = $$("t-noeuds"), gJ = $$("t-jetons");
  const grp = [];

  N.forEach((n, i) => {
    const p = pts[i], teinte = "hsl(" + n.h + ")";

    /* Une courbe, pas une droite : dix droites depuis un même point font une
       étoile de mire ; une courbe fait une toile. */
    const mx = (CX + p.x) / 2 + Math.cos(p.a + Math.PI / 2) * 26;
    const my = (CY + p.y) / 2 + Math.sin(p.a + Math.PI / 2) * 26;
    const d = "M " + CX + " " + CY + " Q " + mx.toFixed(1) + " " + my.toFixed(1) +
              " " + p.x.toFixed(1) + " " + p.y.toFixed(1);

    const ray = el("path", { class: "t-rayon t-" + n.sens, d: d });
    gR.appendChild(ray);

    const g = el("g", {
      class: "t-noeud", tabindex: "0", role: "listitem",
      "aria-label": n.n + ", " + n.f + " : " + n.op,
    });
    g.appendChild(el("circle", { class: "t-anneau", cx: p.x, cy: p.y, r: 21, stroke: teinte }));
    g.appendChild(el("circle", { cx: p.x, cy: p.y, r: 13, fill: teinte }));

    const dehors = 34;
    const tx = p.x + Math.cos(p.a) * dehors, ty = p.y + Math.sin(p.a) * dehors;
    const cote = Math.cos(p.a);
    const anc = Math.abs(cote) < 0.34 ? "middle" : cote > 0 ? "start" : "end";
    const nom = el("text", { class: "t-nom", x: tx, y: ty + 1, "text-anchor": anc });
    nom.textContent = n.n;
    const fam = el("text", { class: "t-fam", x: tx, y: ty + 17, "text-anchor": anc });
    fam.textContent = n.f;
    g.append(nom, fam);
    gN.appendChild(g);

    const j = el("circle", {
      r: 5.5, cx: CX, cy: CY, opacity: 0,
      fill: n.sens === "e" ? "var(--acide)" : teinte,
    });
    gJ.appendChild(j);

    const o = { n: n, ray: ray, j: j, g: g, len: 0,
                phase: (i / N.length) * 2.6 + (i % 3) * 0.31 };
    grp.push(o);

    const montre = () => allume(n.n);
    g.addEventListener("pointerenter", montre);
    g.addEventListener("focusin", montre);
  });

  /* getPointAtLength : le navigateur connaît déjà la Bézier, on ne la
     re-dérive pas à la main. */
  grp.forEach((o) => { o.len = o.ray.getTotalLength(); });

  const repos = () => {
    grp.forEach((x) => x.g.classList.remove("t-actif"));
    $$("t-detail").innerHTML =
      "<b>SwimPay</b><span>tout passe par le même compte</span>";
  };

  /* Le rail choisi allume SON nœud. Avant, les rails vivaient sous un titre
     qui parlait de factures et ne pilotaient qu'une teinte : ils commandent
     maintenant quelque chose qui les concerne.
     SwimPay n'est pas un nœud de la toile — il en est le moyeu : on rend donc
     la main au repos plutôt que de chercher un nœud qui n'existe pas. */
  function allume(nom) {
    const o = grp.find((x) => x.n.n === nom);
    if (!o) { repos(); return; }
    grp.forEach((x) => x.g.classList.remove("t-actif"));
    o.g.classList.add("t-actif");
    $$("t-detail").innerHTML = "<b>" + o.n.n + "</b><span>" + o.n.op + "</span>";
  }
  window.__toileAllume = allume;

  $$("toile").addEventListener("pointerleave", repos);
  repos();

  const bez = (x1, y1, x2, y2) => {
    const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = (a) => 3 * a;
    const cal = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
    const pen = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const dd = pen(t, x1, x2);
        if (Math.abs(dd) < 1e-6) break;
        const e = cal(t, x1, x2) - x;
        if (Math.abs(e) < 1e-6) return cal(t, y1, y2);
        t -= e / dd;
      }
      return cal(t, y1, y2);
    };
  };
  const inOut = bez(0.65, 0, 0.35, 1);
  const CYCLE = 2.9, PAUSE = 1.5, TOTAL = CYCLE + PAUSE;

  let t0 = 0, prec = null, visible = false;
  const doux = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function tour(ts) {
    if (prec !== null && visible && !doux) t0 += (ts - prec) / 1000;
    prec = ts;

    if (visible) {
      let auCentre = 0;
      for (const o of grp) {
        const local = (t0 + o.phase) % TOTAL;
        if (local > CYCLE) { o.j.setAttribute("opacity", "0"); continue; }
        const p = inOut(local / CYCLE);

        /* Le sens : une entrée va du nœud vers le moyeu, une sortie l'inverse.
           « Les deux » alterne d'un passage à l'autre — c'est ce qui distingue
           un rayon qui circule d'un rayon à sens unique. */
        let versCentre = o.n.sens === "e";
        if (o.n.sens === "b") versCentre = Math.floor((t0 + o.phase) / TOTAL) % 2 === 0;

        const l = versCentre ? (1 - p) * o.len : p * o.len;
        const pt = o.ray.getPointAtLength(l);
        o.j.setAttribute("cx", pt.x.toFixed(1));
        o.j.setAttribute("cy", pt.y.toFixed(1));
        o.j.setAttribute("opacity", Math.min(1, Math.sin(p * Math.PI) * 2.4).toFixed(3));
        o.j.setAttribute("r", (4.4 + Math.sin(p * Math.PI) * 2.2).toFixed(2));

        const d2 = (pt.x - CX) * (pt.x - CX) + (pt.y - CY) * (pt.y - CY);
        if (d2 < 4900) auCentre += 1 - Math.sqrt(d2) / 70;
      }
      /* Le halo du moyeu n'est pas une pulsation décorative : il s'allume à la
         mesure de ce qui le traverse à cet instant. */
      $$("t-halo").setAttribute("opacity", Math.min(0.85, auCentre * 0.5).toFixed(3));
      $$("t-halo").setAttribute("r", (54 + Math.min(3, auCentre) * 5).toFixed(1));
    }
    requestAnimationFrame(tour);
  }

  /* Rien ne tourne hors de l'écran. */
  new IntersectionObserver(
    (es) => es.forEach((e) => { visible = e.isIntersecting; }),
    { threshold: 0.12 }
  ).observe($$("toile"));

  requestAnimationFrame(tour);
})();
