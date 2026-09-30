/**
 * L'Annuaire — la normalisation des numeros.
 *
 * Un client = N numeros + comptes, verifies. Tout le reste s'y adosse : le
 * rapprochement, le versement, la facture. Et tout commence par savoir dire
 * que « 0707123456 », « +225 07 07 12 34 56 » et « 22507071234 56 » sont le
 * meme numero — ou ne le sont pas.
 *
 * La Cote d'Ivoire est passee a 10 chiffres en 2021. Les prefixes mobiles
 * portent l'operateur, ce qui donne gratuitement une indication de rail :
 *   01 -> Moov · 05 -> MTN · 07 -> Orange
 * Wave n'a pas de prefixe : c'est un service pose sur les numeros existants,
 * il ne se devine donc jamais depuis le numero.
 */

export class MsisdnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MsisdnError';
  }
}

export type CiOperator = 'moov' | 'mtn' | 'orange';

const PREFIXES: Record<string, CiOperator> = {
  '01': 'moov',
  '05': 'mtn',
  '07': 'orange',
};

/** Les prefixes fixes : valides, mais ils ne portent pas de Mobile Money. */
const FIXES = new Set(['21', '25', '27']);

/**
 * Normalise un numero ivoirien en E.164 (+225 suivi de 10 chiffres).
 *
 * On refuse plutot que de corriger : un numero mal saisi qui « passe » finit
 * en versement chez un inconnu, et cet argent-la ne revient pas.
 */
export function normalizeCiMsisdn(input: string): string {
  if (typeof input !== 'string') throw new MsisdnError('numero absent');
  // On ne garde que les chiffres et un eventuel + de tete.
  const brut = input.trim();
  const plus = brut.startsWith('+');
  let chiffres = brut.replace(/\D/g, '');
  if (!chiffres) throw new MsisdnError(`numero vide : « ${input} »`);

  // 00225… est la forme composee depuis l'etranger.
  if (chiffres.startsWith('00225')) chiffres = chiffres.slice(5);
  else if (chiffres.startsWith('225') && (plus || chiffres.length > 10)) {
    chiffres = chiffres.slice(3);
  }

  /* Le basculement a 10 chiffres date du 31 janvier 2021 et la periode de
     coexistence s'est fermee le 28 fevrier 2021. Un numero a 8 chiffres n'est
     donc pas un numero a completer : c'est une donnee perimee, et la traiter
     comme valide reviendrait a inventer un destinataire. */
  if (chiffres.length !== 10) {
    throw new MsisdnError(
      chiffres.length === 8
        ? `« ${input} » est un ancien numero a 8 chiffres : la numerotation est a 10 chiffres depuis 2021`
        : `un numero ivoirien fait 10 chiffres, recu ${chiffres.length} : « ${input} »`,
    );
  }
  const prefixe = chiffres.slice(0, 2);
  if (!PREFIXES[prefixe] && !FIXES.has(prefixe)) {
    throw new MsisdnError(`prefixe inconnu « ${prefixe} » : « ${input} »`);
  }
  return `+225${chiffres}`;
}

/** L'operateur porte par le prefixe, s'il y en a un. */
export function operatorOf(msisdn: string): CiOperator | undefined {
  const normalise = normalizeCiMsisdn(msisdn);
  return PREFIXES[normalise.slice(4, 6)];
}

/** Un numero fixe ne porte pas de Mobile Money : on ne lui verse rien. */
export function isMobile(msisdn: string): boolean {
  return operatorOf(msisdn) !== undefined;
}

/** L'affichage, groupe comme on le lit a haute voix a Abidjan. */
export function formatCiMsisdn(msisdn: string): string {
  const n = normalizeCiMsisdn(msisdn).slice(4);
  return `+225 ${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6, 8)} ${n.slice(8, 10)}`;
}
