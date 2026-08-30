import { describe, expect, it } from 'vitest';
import { decideMatch } from '../matcher/decide.js';
import { parseReleve, type ProfilReleve, type ResultatImport } from './releves.js';

/* Les profils d essai sont volontairement DIFFERENTS l un de l autre :
   delimiteur, format de date, presence des colonnes sens/statut. C est la
   promesse du contrat — ajouter un operateur, c est ecrire un profil, pas
   toucher au parseur — et les tests la tiennent des maintenant. */

/* Type Wave : virgule, dates ISO, montants signes (pas de colonne sens),
   la reference dans la premiere colonne. */
const wave: ProfilReleve = {
  name: 'wave-ci',
  delimiter: ',',
  colonnes: {
    date: 'Timestamp',
    montant: 'Amount',
    reference: 'Transaction Id',
  },
  formatDate: 'iso',
};

/* Type Orange : point-virgule, dates jj/mm/aaaa hh:mm, montants en
   « 12 500 FCFA », colonnes sens et statut explicites. */
const orange: ProfilReleve = {
  name: 'orange-money-ci',
  delimiter: ';',
  colonnes: {
    date: 'Date operation',
    montant: 'Montant',
    reference: 'Reference',
    sens: 'Sens',
    statut: 'Statut',
  },
  formatDate: 'jj/mm/aaaa hh:mm',
  valeurCredit: 'CREDIT',
  valeurStatutReussi: 'SUCCES',
};

/* Profil reduit au minimum obligatoire, pour isoler chaque cause de rejet. */
const minimal: ProfilReleve = {
  name: 'test-minimal',
  delimiter: ';',
  colonnes: { date: 'Date', montant: 'Montant' },
  formatDate: 'jj/mm/aaaa',
};

/** Deballe la variante ok ; toute autre variante fait echouer le test. */
function attendOk(r: ResultatImport) {
  if (r.kind !== 'ok') throw new Error(`attendu kind ok, recu ${r.kind}`);
  return r;
}

describe('parseReleve — profil type Wave (virgule, ISO, montants signes)', () => {
  // BOM en tete + CRLF : exactement ce que produit un export Windows.
  const fichier =
    '\uFEFF' +
    [
      'Transaction Id,Contrepartie,Timestamp,Amount',
      'WV-1,"KOUASSI, Yao",2026-08-29T09:15:00Z,12500',
      'WV-2,Agent 12,2026-08-29T10:00:00,-4000',
      'WV-3,Comptoir,2026-08-29 11:30:00,"12 500"',
      '',
      'WV-4,Cabine,2026-08-29T12:00:00+02:00,7000',
    ].join('\r\n');

  it('extrait les credits, ignore les debits, malgre le BOM', () => {
    const r = attendOk(parseReleve(fichier, wave));
    expect(r.rejets).toEqual([]);
    expect(r.paiements.map((p) => p.reference)).toEqual(['WV-1', 'WV-3', 'WV-4']);
    expect(r.ignorees).toBe(1); // WV-2, montant negatif : un decaissement, pas une erreur
  });

  it('produit des encaissements reussis, la seule chose que decideMatch consomme', () => {
    const r = attendOk(parseReleve(fichier, wave));
    for (const p of r.paiements) {
      expect(p.operation).toBe('payin');
      expect(p.status).toBe('succeeded');
    }
  });

  it('lit un champ entre guillemets contenant le delimiteur sans decaler les colonnes', () => {
    const r = attendOk(parseReleve(fichier, wave));
    // Si « KOUASSI, Yao » cassait le decoupage, le montant de WV-1 serait faux.
    expect(r.paiements[0]).toMatchObject({ ligne: 2, amountMinor: 12_500 });
  });

  it('lit "12 500" (separateur de milliers, champ guillemete) comme 12500', () => {
    const r = attendOk(parseReleve(fichier, wave));
    expect(r.paiements[1]).toMatchObject({ ligne: 4, amountMinor: 12_500 });
  });

  it('lit les trois ecritures ISO : Z, sans fuseau (GMT Abidjan), avec decalage', () => {
    const r = attendOk(parseReleve(fichier, wave));
    expect(r.paiements.map((p) => p.occurredAt.toISOString())).toEqual([
      '2026-08-29T09:15:00.000Z',
      '2026-08-29T11:30:00.000Z',
      '2026-08-29T10:00:00.000Z', // 12:00 a +02:00
    ]);
  });

  it('exclut du total les lignes vides et les ignorees : total = paiements + rejets', () => {
    const r = attendOk(parseReleve(fichier, wave));
    expect(r.total).toBe(r.paiements.length + r.rejets.length);
    expect(r.total).toBe(3);
  });
});

describe('parseReleve — profil type Orange (point-virgule, jj/mm/aaaa hh:mm, sens et statut)', () => {
  const fichier = [
    'Date operation;Sens;Statut;Montant;Reference',
    '29/08/2026 09:05;CREDIT;SUCCES;12 500 FCFA;OM-100',
    '29/08/2026 09:20;DEBIT;SUCCES;8 000 FCFA;OM-101',
    '29/08/2026 09:45;CREDIT;ECHEC;5 000 FCFA;OM-102',
    '29/08/2026 10:10;credit;succes;40 000 FCFA;',
  ].join('\n');

  it('garde les credits aboutis, ignore debit et echec, sans les rejeter', () => {
    const r = attendOk(parseReleve(fichier, orange));
    expect(r.rejets).toEqual([]);
    expect(r.paiements.map((p) => p.amountMinor)).toEqual([12_500, 40_000]);
    expect(r.ignorees).toBe(2); // OM-101 (debit) et OM-102 (echec)
  });

  it('compare sens et statut sans casse : « credit »/« succes » passent', () => {
    const r = attendOk(parseReleve(fichier, orange));
    expect(r.paiements[1]).toMatchObject({ ligne: 5, amountMinor: 40_000 });
  });

  it('lit « 12 500 FCFA » comme 12500 et la date jj/mm/aaaa hh:mm en UTC', () => {
    const r = attendOk(parseReleve(fichier, orange));
    expect(r.paiements[0]!.amountMinor).toBe(12_500);
    expect(r.paiements[0]!.occurredAt.toISOString()).toBe('2026-08-29T09:05:00.000Z');
  });

  it('rend une reference vide comme undefined, pas comme chaine vide', () => {
    const r = attendOk(parseReleve(fichier, orange));
    expect(r.paiements[1]!.reference).toBeUndefined();
  });
});

describe('parseReleve — chaque ligne illisible est rejetee avec sa raison, le fichier survit', () => {
  const fichier = [
    'Date;Montant',
    '29/08/2026;1500,50',
    '29/08/2026;douze mille',
    '2026-08-29;1500',
    '31/02/2026;1500',
    '29/08/2026',
    '29/08/2026;"1500',
    '29/08/2026;0',
    '29/08/2026;2000',
  ].join('\n');

  const r = attendOk(parseReleve(fichier, minimal));

  it('le fichier entier n echoue pas : la bonne ligne passe, les autres sont des rejets', () => {
    expect(r.paiements).toHaveLength(1);
    expect(r.paiements[0]).toMatchObject({ ligne: 9, amountMinor: 2_000 });
    expect(r.rejets).toHaveLength(7);
    expect(r.total).toBe(8);
  });

  it('rejette un montant a decimales : le XOF n a pas de centime', () => {
    const rejet = r.rejets.find((x) => x.ligne === 2)!;
    expect(rejet.raison).toContain('centime');
    expect(rejet.brut).toBe('29/08/2026;1500,50');
  });

  it('rejette un montant illisible', () => {
    expect(r.rejets.find((x) => x.ligne === 3)!.raison).toContain('illisible');
  });

  it('rejette une date au mauvais format', () => {
    expect(r.rejets.find((x) => x.ligne === 4)!.raison).toContain('date illisible');
  });

  it('rejette une date que le calendrier refuse (31/02)', () => {
    expect(r.rejets.find((x) => x.ligne === 5)!.raison).toContain('date illisible');
  });

  it('rejette une ligne trop courte au lieu de la completer par du vide', () => {
    expect(r.rejets.find((x) => x.ligne === 6)!.raison).toContain('incomplete');
  });

  it('rejette un guillemet jamais referme au lieu de le fermer a sa place', () => {
    expect(r.rejets.find((x) => x.ligne === 7)!.raison).toContain('guillemet');
  });

  it('rejette un montant nul : zero franc encaisse est un mauvais mapping', () => {
    expect(r.rejets.find((x) => x.ligne === 8)!.raison).toContain('nul');
  });

  it('chaque rejet garde la ligne brute pour que l humain juge sur piece', () => {
    for (const rejet of r.rejets) {
      expect(rejet.brut).toBe(fichier.split('\n')[rejet.ligne - 1]);
    }
  });
});

describe('parseReleve — sens et statut ne se devinent pas', () => {
  const fichier = [
    'Date operation;Sens;Statut;Montant;Reference',
    '29/08/2026 09:05;;SUCCES;1000;R1',
    '29/08/2026 09:06;CREDIT;;1000;R2',
    '29/08/2026 09:07;CREDIT;SUCCES;-1000;R3',
  ].join('\n');

  const r = attendOk(parseReleve(fichier, orange));

  it('rejette un sens vide plutot que de supposer un credit', () => {
    expect(r.rejets.find((x) => x.ligne === 2)!.raison).toContain('sens vide');
  });

  it('rejette un statut vide plutot que de supposer un succes', () => {
    expect(r.rejets.find((x) => x.ligne === 3)!.raison).toContain('statut vide');
  });

  it('rejette un montant negatif marque credit : la contradiction se montre', () => {
    expect(r.rejets.find((x) => x.ligne === 4)!.raison).toContain('contradiction');
    expect(r.paiements).toHaveLength(0);
  });
});

describe('parseReleve — l en-tete est la cle du mapping : son absence est un echec global', () => {
  it('refuse d un bloc un fichier dont l en-tete ne porte pas les colonnes du profil', () => {
    const r = parseReleve('Foo;Bar\n29/08/2026;1500', minimal);
    expect(r.kind).toBe('entete_invalide');
    if (r.kind === 'entete_invalide') {
      expect(r.colonnesManquantes).toEqual(['Date', 'Montant']);
    }
  });

  it('refuse un fichier vide, ou fait de lignes blanches', () => {
    expect(parseReleve('', minimal).kind).toBe('entete_invalide');
    expect(parseReleve('\n   \n', minimal).kind).toBe('entete_invalide');
  });

  it('refuse deux colonnes du meme nom : choisir l une serait deviner', () => {
    const r = parseReleve('Date;Montant;Montant\n29/08/2026;1500;1500', minimal);
    expect(r.kind).toBe('entete_invalide');
    if (r.kind === 'entete_invalide') expect(r.raison).toContain('double');
  });

  it('trouve les colonnes sans casse : DATE vaut Date', () => {
    const r = attendOk(parseReleve('DATE;MONTANT\n29/08/2026;1500', minimal));
    expect(r.paiements).toHaveLength(1);
  });

  it('retire le BOM UTF-8 avant de lire le nom de la premiere colonne', () => {
    const r = attendOk(parseReleve('\uFEFF' + 'Date;Montant\n29/08/2026;1500', minimal));
    expect(r.paiements).toHaveLength(1);
  });
});

describe('parseReleve — le profil est une donnee, donc il se verifie', () => {
  it('refuse une colonne sens declaree sans valeurCredit', () => {
    const profil: ProfilReleve = {
      ...minimal,
      colonnes: { ...minimal.colonnes, sens: 'Sens' },
    };
    const r = parseReleve('Date;Montant;Sens\n29/08/2026;1500;CREDIT', profil);
    expect(r.kind).toBe('profil_invalide');
  });

  it('refuse une colonne statut declaree sans valeurStatutReussi', () => {
    const profil: ProfilReleve = {
      ...minimal,
      colonnes: { ...minimal.colonnes, statut: 'Statut' },
    };
    const r = parseReleve('Date;Montant;Statut\n29/08/2026;1500;SUCCES', profil);
    expect(r.kind).toBe('profil_invalide');
  });
});

describe('parseReleve — un troisieme operateur est un profil, pas du code', () => {
  it('lit un export tabule type MTN avec le meme parseur', () => {
    const mtn: ProfilReleve = {
      name: 'mtn-momo-ci',
      delimiter: '\t',
      colonnes: { date: 'Date', montant: 'Amount' },
      formatDate: 'iso',
    };
    const r = attendOk(parseReleve('Date\tAmount\n2026-08-29\t3000', mtn));
    expect(r.paiements[0]).toMatchObject({ amountMinor: 3_000 });
    expect(r.paiements[0]!.occurredAt.toISOString()).toBe('2026-08-29T00:00:00.000Z');
  });
});

describe('parseReleve — une ligne decalee ne produit jamais un paiement plausible et faux', () => {
  it('rejette une ligne qui a plus de champs que l en-tete au lieu de lire un montant decale', () => {
    // « 12,500 » non guillemete dans un fichier a virgule : le decoupage donne
    // quatre champs pour trois colonnes, et la colonne Amount tombe sur « 12 ».
    // Sans le rejet, un paiement de 12 XOF sortirait — plausible et faux.
    const r = attendOk(
      parseReleve('Transaction Id,Timestamp,Amount\nWV-9,2026-08-29T10:00:00Z,12,500', wave),
    );
    expect(r.paiements).toEqual([]);
    expect(r.rejets).toHaveLength(1);
    expect(r.rejets[0]!.raison).toContain('decale');
  });

  it('rejette un delimiteur final surnumeraire plutot que d ignorer un champ fantome', () => {
    const r = attendOk(parseReleve('Date;Montant\n29/08/2026;1500;', minimal));
    expect(r.paiements).toEqual([]);
    expect(r.rejets).toHaveLength(1);
  });

  it('rejette deux nombres fusionnes « 1500 2000 » au lieu de coller leurs chiffres', () => {
    // Ecraser tous les espaces lirait 15002000 : un montant invente.
    const r = attendOk(parseReleve('Date;Montant\n29/08/2026;1500 2000', minimal));
    expect(r.paiements).toEqual([]);
    expect(r.rejets[0]!.raison).toContain('groupement');
  });

  it('accepte le groupement de milliers regulier « 1 234 567 »', () => {
    const r = attendOk(parseReleve('Date;Montant\n29/08/2026;1 234 567', minimal));
    expect(r.paiements[0]!.amountMinor).toBe(1_234_567);
  });

  it('rejette un montant au-dela des entiers surs', () => {
    const r = attendOk(parseReleve('Date;Montant\n29/08/2026;99999999999999999999', minimal));
    expect(r.rejets[0]!.raison).toContain('bornes');
  });
});

describe('parseReleve — le profil incoherent est refuse avant de lire une ligne', () => {
  it('refuse un nom de colonne blanc : il matcherait un champ d en-tete vide', () => {
    const profil: ProfilReleve = {
      ...minimal,
      colonnes: { ...minimal.colonnes, reference: ' ' },
    };
    // L en-tete finit par un delimiteur : son dernier champ est vide, et un
    // nom de colonne blanc s y accrocherait — mapping fantome.
    const r = parseReleve('Date;Montant;\n29/08/2026;1500;', profil);
    expect(r.kind).toBe('profil_invalide');
  });

  it('refuse deux roles declares sur le meme nom de colonne', () => {
    const profil: ProfilReleve = {
      ...minimal,
      colonnes: { date: 'Date', montant: 'Date' },
    };
    expect(parseReleve('Date;Montant\n29/08/2026;1500', profil).kind).toBe('profil_invalide');
  });

  it('refuse une valeurCredit blanche : toutes les lignes finiraient ignorees en silence', () => {
    const profil: ProfilReleve = {
      ...minimal,
      colonnes: { ...minimal.colonnes, sens: 'Sens' },
      valeurCredit: '  ',
    };
    expect(parseReleve('Date;Montant;Sens\n29/08/2026;1500;CREDIT', profil).kind).toBe(
      'profil_invalide',
    );
  });

  it('refuse une valeurStatutReussi blanche, pour la meme raison', () => {
    const profil: ProfilReleve = {
      ...minimal,
      colonnes: { ...minimal.colonnes, statut: 'Statut' },
      valeurStatutReussi: '',
    };
    expect(parseReleve('Date;Montant;Statut\n29/08/2026;1500;SUCCES', profil).kind).toBe(
      'profil_invalide',
    );
  });
});

describe('parseReleve — les dates impossibles ne se convertissent pas, elles se refusent', () => {
  const isoMin: ProfilReleve = {
    name: 'iso-minimal',
    delimiter: ';',
    colonnes: { date: 'Date', montant: 'Montant' },
    formatDate: 'iso',
  };

  it('rejette un decalage horaire impossible (+02:75)', () => {
    const r = attendOk(parseReleve('Date;Montant\n2026-08-29T12:00:00+02:75;1500', isoMin));
    expect(r.paiements).toEqual([]);
    expect(r.rejets[0]!.raison).toContain('date illisible');
  });

  it('rejette une fraction sans secondes « 09:15.5 » : c est une fraction de minute ISO, pas 500 ms', () => {
    const r = attendOk(parseReleve('Date;Montant\n2026-08-29T09:15.5;1500', isoMin));
    expect(r.paiements).toEqual([]);
    expect(r.rejets[0]!.raison).toContain('date illisible');
  });
});

describe('parseReleve — la sortie se branche telle quelle sur le Rapprocheur', () => {
  it('un paiement importe passe dans decideMatch et rapproche par reference', () => {
    const r = attendOk(
      parseReleve('Date;Montant;Reference\n29/08/2026;50000;VTE-42', {
        ...minimal,
        colonnes: { ...minimal.colonnes, reference: 'Reference' },
      }),
    );
    const decision = decideMatch(r.paiements[0]!, [
      {
        id: 'vente-a',
        amountMinor: 50_000,
        reference: 'VTE-42',
        occurredAt: new Date('2026-08-29T06:00:00.000Z'),
      },
    ]);
    expect(decision).toMatchObject({ kind: 'match', saleId: 'vente-a', method: 'auto_ref' });
  });
});
