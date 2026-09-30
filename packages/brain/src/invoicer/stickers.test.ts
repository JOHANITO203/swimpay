import { describe, expect, it } from 'vitest';
import {
  evalueStock,
  facturesGratuites,
  FRANCHISE_STICKER_MINOR,
  type StickerObservation,
} from './stickers.js';

/* Les series ci-dessous sont construites en jours entiers UTC : les durees
   tombent juste, donc les jours restants attendus sont EXACTS — pas de
   toBeCloseTo qui masquerait une erreur de calcul. */

const T0 = Date.UTC(2026, 7, 1); // 1er aout 2026, minuit UTC
const MS_PAR_JOUR = 86_400_000;

function jour(n: number): Date {
  return new Date(T0 + n * MS_PAR_JOUR);
}

function obs(jourN: number, balance: number, merchantId = 'm-1'): StickerObservation {
  return { merchantId, balance, observedAt: jour(jourN) };
}

describe('evalueStock — consommation reguliere', () => {
  it('rend des jours restants exacts sur une consommation constante', () => {
    // 10 stickers/jour sur 4 jours, solde final 160 -> 16 jours exactement.
    const v = evalueStock([obs(0, 200), obs(1, 190), obs(2, 180), obs(3, 170), obs(4, 160)]);
    expect(v.level).toBe('ok');
    expect(v.balance).toBe(160);
    expect(v.joursRestants).toBe(16);
  });

  it('tolere une entree non triee : le tri est defensif', () => {
    const v = evalueStock([obs(4, 160), obs(0, 200), obs(2, 180), obs(1, 190), obs(3, 170)]);
    expect(v.joursRestants).toBe(16);
    expect(v.balance).toBe(160);
  });

  it("le seuil d'alerte est a borne incluse : 10 jours exactement -> 'alerte'", () => {
    // 10/jour, solde 100 -> exactement 10 jours.
    const v = evalueStock([obs(0, 130), obs(1, 120), obs(2, 110), obs(3, 100)]);
    expect(v.joursRestants).toBe(10);
    expect(v.level).toBe('alerte');
  });

  it("le seuil critique est a borne incluse : 3 jours exactement -> 'critique'", () => {
    // 10/jour, solde 30 -> exactement 3 jours.
    const v = evalueStock([obs(0, 60), obs(1, 50), obs(2, 40), obs(3, 30)]);
    expect(v.joursRestants).toBe(3);
    expect(v.level).toBe('critique');
  });
});

describe('evalueStock — la recharge en milieu de fenetre', () => {
  it('ecarte la remontee : jamais de consommation negative ni de jours absurdes', () => {
    // 10/jour, recharge de +510 au jour 3 (80 -> 580, soit +500 net apres la
    // consommation du jour). Une moyenne naive (100 - 560) / 5 jours rendrait
    // une consommation NEGATIVE, donc des jours restants sans aucun sens.
    const serie = [obs(0, 100), obs(1, 90), obs(2, 80), obs(3, 580), obs(4, 570), obs(5, 560)];
    const v = evalueStock(serie);
    // Segments decroissants seulement : 40 stickers sur 4 jours -> 10/jour.
    expect(v.joursRestants).toBe(56);
    expect(v.level).toBe('ok');
    expect(v.balance).toBe(560);
  });

  it("une fenetre faite uniquement de remontees ne permet AUCUNE estimation -> 'inconnu'", () => {
    const v = evalueStock([obs(0, 10), obs(1, 500)]);
    expect(v.level).toBe('inconnu');
    expect(v.balance).toBe(500);
    expect(v.joursRestants).toBeUndefined();
  });
});

describe('evalueStock — la fenetre glissante', () => {
  it('ecarte le passe hors fenetre : une vieille recharge ne pollue pas le taux', () => {
    // Jour 0 : solde 1000, puis rien pendant 19 jours. La fenetre de 14 jours
    // (ancree au jour 20) ne garde que les jours 19 et 20 : 10 stickers sur
    // 1 jour -> 10 jours restants -> alerte, borne incluse.
    const serie = [obs(0, 1000), obs(19, 110), obs(20, 100)];
    const v = evalueStock(serie);
    expect(v.joursRestants).toBe(10);
    expect(v.level).toBe('alerte');
  });

  it('la fenetre est parametrable : elargie, elle reintegre le passe', () => {
    // Meme serie, fenetre de 30 jours : 900 stickers sur 20 jours -> 45/jour,
    // 100 / 45 ~ 2,2 jours -> critique. La fenetre change le verdict.
    const serie = [obs(0, 1000), obs(19, 110), obs(20, 100)];
    const v = evalueStock(serie, { fenetreJours: 30 });
    expect(v.level).toBe('critique');
    expect(v.joursRestants).toBeCloseTo(100 / 45, 10);
  });
});

describe('evalueStock — epuise, vide, insuffisant', () => {
  it("balance 0 est 'epuise' MEME sans historique : le fait est observe, pas estime", () => {
    const v = evalueStock([obs(0, 0)]);
    expect(v.level).toBe('epuise');
    expect(v.balance).toBe(0);
    expect(v.joursRestants).toBe(0);
  });

  it("balance 0 en fin d'historique est 'epuise', quelle que soit la tendance", () => {
    const v = evalueStock([obs(0, 20), obs(1, 10), obs(2, 0)]);
    expect(v.level).toBe('epuise');
    expect(v.balance).toBe(0);
  });

  it("balance 0 prime meme sur des options invalides : la rupture n'attend pas", () => {
    const v = evalueStock([obs(0, 0)], { fenetreJours: -1 });
    expect(v.level).toBe('epuise');
  });

  it("historique vide -> 'inconnu', et le solde n'est PAS invente a zero", () => {
    const v = evalueStock([]);
    expect(v.level).toBe('inconnu');
    expect(v.balance).toBeUndefined();
    expect(v.joursRestants).toBeUndefined();
  });

  it("une seule observation (solde > 0) -> 'inconnu' : on ne devine pas un taux", () => {
    const v = evalueStock([obs(0, 500)]);
    expect(v.level).toBe('inconnu');
    expect(v.balance).toBe(500);
    expect(v.joursRestants).toBeUndefined();
  });

  it("consommation nulle observee -> 'ok' sans jours restants : rien ne s'epuise", () => {
    const v = evalueStock([obs(0, 50), obs(7, 50)]);
    expect(v.level).toBe('ok');
    expect(v.balance).toBe(50);
    expect(v.joursRestants).toBeUndefined();
  });
});

describe('evalueStock — seuils personnalises', () => {
  // 16 jours restants avec les memes donnees que le premier test.
  const serie = [obs(0, 200), obs(1, 190), obs(2, 180), obs(3, 170), obs(4, 160)];

  it('les seuils par defaut donnent ok, des seuils plus prudents donnent alerte ou critique', () => {
    expect(evalueStock(serie).level).toBe('ok');
    expect(evalueStock(serie, { seuilAlerteJours: 20, seuilCritiqueJours: 5 }).level).toBe('alerte');
    expect(evalueStock(serie, { seuilAlerteJours: 30, seuilCritiqueJours: 20 }).level).toBe('critique');
  });

  it("des seuils incoherents (critique > alerte) rendent 'inconnu', pas une alerte muette", () => {
    const v = evalueStock(serie, { seuilAlerteJours: 5, seuilCritiqueJours: 20 });
    expect(v.level).toBe('inconnu');
    expect(v.balance).toBe(160);
  });

  it("une fenetre invalide rend 'inconnu'", () => {
    expect(evalueStock(serie, { fenetreJours: 0 }).level).toBe('inconnu');
  });
});

describe('evalueStock — entrees refusees, jamais corrigees en silence', () => {
  it('des observations de plusieurs marchands melangees sont refusees', () => {
    const v = evalueStock([obs(0, 100), obs(1, 90, 'm-2')]);
    expect(v.level).toBe('inconnu');
    expect(v.balance).toBeUndefined();
  });

  it('un solde aberrant (negatif ou non entier) est refuse', () => {
    expect(evalueStock([obs(0, -5)]).level).toBe('inconnu');
    expect(evalueStock([obs(0, 12.5)]).level).toBe('inconnu');
  });

  it('une date d observation invalide est refusee', () => {
    const v = evalueStock([
      obs(0, 100),
      { merchantId: 'm-1', balance: 90, observedAt: new Date(Number.NaN) },
    ]);
    expect(v.level).toBe('inconnu');
  });

  it("un seuil critique negatif est refuse : une alerte a seuil negatif ne part jamais", () => {
    const serie = [obs(0, 130), obs(1, 120), obs(2, 110), obs(3, 100)];
    expect(evalueStock(serie, { seuilCritiqueJours: -1 }).level).toBe('inconnu');
  });

  it("un journal corrompu est refuse MEME si sa derniere lecture propre est 0 : on ne trie pas dans du corrompu", () => {
    // La primaute de 'epuise' vaut face aux OPTIONS invalides, pas face a un
    // journal aberrant : un solde negatif quelque part discredite tout le
    // journal, y compris son zero.
    const v = evalueStock([obs(0, -1), obs(1, 0)]);
    expect(v.level).toBe('inconnu');
    expect(v.balance).toBeUndefined();
  });
});

describe('evalueStock — bords numeriques et de fenetre', () => {
  it('la borne critique tient meme quand la duree n est pas un nombre de jours representable', () => {
    // 3 stickers consommes en 1,8 jour, solde 5 : exactement 3,0 jours
    // restants -> 'critique' (borne incluse). La double division
    // balance / (consomme / dureeJours) rendait 3.0000000000000004 -> 'alerte' :
    // l alerte la plus grave rendue un cran trop faible, pile sur la borne promise.
    const unVirguleHuitJours = 155_520_000; // 1,8 * 86 400 000, entier en ms
    const v = evalueStock([
      { merchantId: 'm-1', balance: 8, observedAt: new Date(T0) },
      { merchantId: 'm-1', balance: 5, observedAt: new Date(T0 + unVirguleHuitJours) },
    ]);
    expect(v.joursRestants).toBe(3);
    expect(v.level).toBe('critique');
  });

  it("deux lectures au meme instant ne fabriquent pas un taux infini -> 'inconnu'", () => {
    // Une chute de solde sur une duree nulle : diviser rendrait Infinity ou
    // un taux delirant. On refuse.
    const v = evalueStock([obs(0, 100), obs(0, 90)]);
    expect(v.level).toBe('inconnu');
    expect(v.joursRestants).toBeUndefined();
  });

  it('une observation PILE au bord de la fenetre est incluse (borne >= )', () => {
    // Derniere observation au jour 20, fenetre 14 -> le bord est le jour 6.
    // Si le bord etait exclusif, il ne resterait qu une observation -> inconnu.
    const v = evalueStock([obs(6, 240), obs(20, 100)]);
    expect(v.joursRestants).toBe(10);
    expect(v.level).toBe('alerte');
  });
});

describe('facturesGratuites — la franchise <= 5 000 F', () => {
  it('la borne est INCLUSE : 5 000 F exactement est gratuit (doc 08 §6.1, releve « <= 5 000 »)', () => {
    expect(facturesGratuites(FRANCHISE_STICKER_MINOR)).toBe(true);
    expect(facturesGratuites(5000)).toBe(true);
    expect(facturesGratuites(5001)).toBe(false);
  });

  it('sous la franchise et au-dessus', () => {
    expect(facturesGratuites(0)).toBe(true);
    expect(facturesGratuites(4999)).toBe(true);
    expect(facturesGratuites(20_000)).toBe(false);
  });

  it("un montant aberrant n'est JAMAIS presume gratuit : dans le doute on provisionne", () => {
    expect(facturesGratuites(-1)).toBe(false);
    expect(facturesGratuites(2500.5)).toBe(false);
    expect(facturesGratuites(Number.NaN)).toBe(false);
    expect(facturesGratuites(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
