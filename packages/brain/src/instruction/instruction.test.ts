import { describe, expect, it } from 'vitest';
import {
  inspect,
  InstructionNotReadyError,
  questionsAvoided,
  seal,
  type InstructionDraft,
} from './instruction.js';
import {
  advanceStage,
  invitationSaving,
  resolveReachability,
  summarizeQueue,
  type Recipient,
} from '../directory/recipient.js';

const dest = (over: Partial<Recipient> = {}): Recipient => ({
  id: 'r1',
  displayName: 'Issa D.',
  stage: 'ad_hoc',
  ...over,
});

const brouillon = (over: Partial<InstructionDraft> = {}): InstructionDraft => ({
  kind: 'transfer',
  ...over,
});

describe('Le workflow impose — chaque etape ferme une inconnue', () => {
  it('demande l origine en premier, avant tout le reste', () => {
    expect(inspect(brouillon()).step).toBe('origin');
  });

  it('demande ensuite le destinataire', () => {
    const s = inspect(brouillon({ originAccountId: 'c1' }));
    expect(s.step).toBe('recipient');
  });

  it('demande la destination pour un destinataire saisi a la volee', () => {
    const s = inspect(brouillon({ originAccountId: 'c1', recipient: dest() }));
    expect(s.step).toBe('destination');
    expect(s.blockers).toContain('destination_missing');
    expect(s.blockers).toContain('rail_missing');
  });

  it('demande le montant une fois la destination connue', () => {
    const s = inspect(
      brouillon({
        originAccountId: 'c1',
        recipient: dest(),
        destinationValue: '+2250707123456',
        chosenRail: 'orange-money-ci',
      }),
    );
    expect(s.step).toBe('amount');
  });

  it('refuse un montant nul ou fractionnaire', () => {
    const base = {
      originAccountId: 'c1',
      recipient: dest(),
      destinationValue: '+2250707123456',
      chosenRail: 'orange-money-ci',
    };
    expect(inspect(brouillon({ ...base, amountMinor: 0 })).blockers).toContain('amount_invalid');
    expect(inspect(brouillon({ ...base, amountMinor: 10.5 })).blockers).toContain('amount_invalid');
  });

  it('exige que l utilisateur ait VU les frais avant d executer', () => {
    const s = inspect(
      brouillon({
        originAccountId: 'c1',
        recipient: dest(),
        destinationValue: '+2250707123456',
        chosenRail: 'orange-money-ci',
        amountMinor: 50_000,
      }),
    );
    expect(s.executable).toBe(false);
    expect(s.blockers).toEqual(['quote_not_acknowledged']);
    expect(s.step).toBe('review');
  });

  it('devient executable quand plus rien n est inconnu', () => {
    const s = inspect(
      brouillon({
        originAccountId: 'c1',
        recipient: dest(),
        destinationValue: '+2250707123456',
        chosenRail: 'orange-money-ci',
        amountMinor: 50_000,
        quoteAcknowledged: true,
      }),
    );
    expect(s.executable).toBe(true);
    expect(s.blockers).toEqual([]);
  });

  it('refuse de sceller une instruction incomplete', () => {
    expect(() => seal(brouillon(), { sessionNonce: 'n1' })).toThrow(InstructionNotReadyError);
  });

  it('derive la cle d idempotence du contenu : deux fois le meme geste, une operation', () => {
    const d = brouillon({
      originAccountId: 'c1',
      recipient: dest(),
      destinationValue: '+2250707123456',
      chosenRail: 'orange-money-ci',
      amountMinor: 50_000,
      quoteAcknowledged: true,
    });
    const a = seal(d, { sessionNonce: 'n1' });
    const b = seal(d, { sessionNonce: 'n1' });
    expect(b.idempotencyKey).toBe(a.idempotencyKey);
  });

  it('change de cle des que le montant change', () => {
    const base = {
      originAccountId: 'c1',
      recipient: dest(),
      destinationValue: '+2250707123456',
      chosenRail: 'orange-money-ci',
      quoteAcknowledged: true,
    };
    const a = seal(brouillon({ ...base, amountMinor: 50_000 }), { sessionNonce: 'n1' });
    const b = seal(brouillon({ ...base, amountMinor: 60_000 }), { sessionNonce: 'n1' });
    expect(b.idempotencyKey).not.toBe(a.idempotencyKey);
  });
});

describe('Le determinisme — ce que le workflow n a plus a demander', () => {
  it('ne demande plus rien au deuxieme envoi vers un beneficiaire enregistre', () => {
    const enregistre = dest({
      stage: 'saved',
      destinationValue: '+2250707123456',
      preferredRail: 'orange-money-ci',
      successfulTransfers: 1,
    });
    const s = inspect(brouillon({ originAccountId: 'c1', recipient: enregistre }));
    // Il ne reste que le montant : la destination est deja connue.
    expect(s.blockers).not.toContain('destination_missing');
    expect(s.blockers).not.toContain('rail_missing');
    expect(s.step).toBe('amount');
    expect(questionsAvoided(enregistre)).toEqual(['destination_value', 'destination_rail']);
  });

  it('ne demande MEME PAS la destination quand le destinataire a installe l app', () => {
    const actif = dest({ stage: 'active' });
    const s = inspect(brouillon({ originAccountId: 'c1', recipient: actif }));
    expect(s.blockers).not.toContain('destination_missing');
    expect(s.blockers).not.toContain('rail_missing');
    expect(s.prefilled).toContain('destination');
  });

  it('scelle un envoi direct, sans rail ni destination', () => {
    const i = seal(
      brouillon({
        originAccountId: 'c1',
        recipient: dest({ stage: 'active' }),
        amountMinor: 50_000,
        quoteAcknowledged: true,
      }),
      { sessionNonce: 'n1' },
    );
    expect(i.direct).toBe(true);
    expect(i.rail).toBeUndefined();
    expect(i.destinationValue).toBeUndefined();
  });

  it('laisse le choix de l utilisateur primer sur la preference enregistree', () => {
    const i = seal(
      brouillon({
        originAccountId: 'c1',
        recipient: dest({ stage: 'saved', destinationValue: '+2250707123456', preferredRail: 'orange-money-ci' }),
        chosenRail: 'wave-ci',
        amountMinor: 50_000,
        quoteAcknowledged: true,
      }),
      { sessionNonce: 'n1' },
    );
    expect(i.rail).toBe('wave-ci');
  });
});

describe('La file d installation — ce que l invitation change', () => {
  it('rend un destinataire actif gratuit et immediat', () => {
    const v = resolveReachability(dest({ stage: 'active' }));
    expect(v).toMatchObject({ reachability: 'swimpay_direct', free: true, immediate: true });
  });

  it('laisse un invite non installe sur le rail, avec ses frais', () => {
    const v = resolveReachability(
      dest({ stage: 'invited', destinationValue: '+2250707123456', preferredRail: 'orange-money-ci' }),
    );
    expect(v).toMatchObject({ reachability: 'rail', free: false, immediate: false });
  });

  it('dit ce qui manque quand la destination n a pas ete declaree', () => {
    const v = resolveReachability(dest());
    expect(v.reachability).toBe('unknown');
    expect(v.missing).toEqual(['destination_value', 'destination_rail']);
  });

  it('chiffre ce que l installation ferait economiser', () => {
    const surRail = dest({ stage: 'invited', destinationValue: '+225', preferredRail: 'orange-money-ci' });
    expect(invitationSaving(surRail, 120_000, 1_900)).toEqual({ saves: 1_900, alreadyFree: false });
    expect(invitationSaving(dest({ stage: 'active' }), 120_000, 1_900)).toEqual({
      saves: 0,
      alreadyFree: true,
    });
  });

  it('resume la file : chaque installation retire son cout', () => {
    const equipe = [
      dest({ id: '1', stage: 'active' }),
      dest({ id: '2', stage: 'active' }),
      dest({ id: '3', stage: 'invited', destinationValue: '+225', preferredRail: 'orange-money-ci' }),
      dest({ id: '4', stage: 'saved', destinationValue: '+225', preferredRail: 'mtn-ci' }),
      dest({ id: '5', stage: 'saved', destinationValue: '+225', preferredRail: 'wave-ci' }),
    ];
    const s = summarizeQueue(equipe, () => 1_900);
    expect(s).toMatchObject({
      total: 5,
      active: 2,
      invited: 1,
      pending: 2,
      railCostMinor: 5_700,
      fullyInstalledCostMinor: 0,
    });
  });

  it('le parcours est un cliquet : un actif ne redescend pas', () => {
    expect(advanceStage('ad_hoc', 'saved')).toBe('saved');
    expect(advanceStage('saved', 'invited')).toBe('invited');
    expect(advanceStage('invited', 'activated')).toBe('active');
    expect(advanceStage('active', 'invited')).toBe('active');
    expect(advanceStage('active', 'saved')).toBe('active');
  });
});
