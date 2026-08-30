/* Le Worker qui sert le site SwimPay.
 *
 * Il ne fabrique rien : les fichiers viennent du binding ASSETS, servis par le
 * réseau de Cloudflare. Il n'existe que pour poser les en-têtes de sécurité —
 * un hébergement statique nu ne les met pas, et un site qui parle d'argent ne
 * peut pas s'en passer.
 *
 * Zéro dépendance. */

/* La politique de sécurité du contenu, taillée sur ce que la page fait
 * RÉELLEMENT — pas recopiée d'un modèle :
 *
 *   style-src   'unsafe-inline' parce que toute la feuille est en ligne dans
 *               le document, plus fonts.googleapis.com d'où vient Outfit.
 *   font-src    fonts.gstatic.com, où Google sert les fichiers de police.
 *   img/media   data: parce que images et vidéo sont incrustées en base64.
 *   script-src  'unsafe-inline' : le script est en ligne lui aussi. C'est la
 *               ligne la plus faible de cette politique, et elle disparaîtra
 *               le jour où le script sortira du document.
 *   frame-ancestors 'none' : personne ne met ce site dans une iframe. C'est
 *               ce qui empêche qu'on l'habille d'une fausse page pour
 *               récolter ce qu'un visiteur y tape.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "media-src 'self' data:",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const ENTETES = {
  "content-security-policy": CSP,
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  /* Rien de tout cela n'est utilisé par le site : on le refuse explicitement
     plutôt que de laisser la porte ouverte. */
  "permissions-policy": "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()",
  /* Deux ans, sous-domaines compris. À ne garder que si TOUS les
     sous-domaines sont bien en HTTPS — sinon c'est un aller sans retour. */
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "cross-origin-opener-policy": "same-origin",
};

export default {
  async fetch(request, env) {
    /* Le site est en lecture seule : rien d'autre que GET et HEAD n'a de sens,
       et les formulaires ne postent nulle part. */
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Méthode non autorisée", {
        status: 405,
        headers: { allow: "GET, HEAD", ...ENTETES },
      });
    }

    const reponse = await env.ASSETS.fetch(request);
    const entetes = new Headers(reponse.headers);
    for (const [k, v] of Object.entries(ENTETES)) entetes.set(k, v);

    /* Le document change à chaque publication : on le revalide à chaque fois.
       Les images et l'icône, elles, portent leur contenu dans leur nom de
       fichier tant qu'on ne les remplace pas — un an de cache leur va. */
    const type = entetes.get("content-type") || "";
    entetes.set(
      "cache-control",
      type.includes("text/html")
        ? "public, max-age=0, must-revalidate"
        : "public, max-age=31536000, immutable"
    );

    return new Response(reponse.body, {
      status: reponse.status,
      statusText: reponse.statusText,
      headers: entetes,
    });
  },
};
