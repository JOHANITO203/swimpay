# @swimpay/brain — le Cerveau

La logique métier de SwimPay, **pure** : aucun fournisseur, aucun réseau,
aucune base. Les bras (PayDunya, la DGI) se branchent derrière `@swimpay/rails`
et le contrat `DgiAdapter`. Seule contrainte d'environnement : `node:crypto`
dans `directory/identity.ts` — le paquet suppose un runtime Node.

## Les neuf domaines

| domaine | ce qu'il décide |
|---|---|
| `matcher/` | une opération observée correspond-elle à une attendue |
| `invoicer/` | totaux en entiers XOF, payload DGI, machine à états FNE, stickers |
| `directory/` | MSISDN, identité, destinataires |
| `router/` | le chemin d'exécution et son **coût** |
| `pricing/` | le **prix** client, par nature d'opération |
| `decision/` | l'arbitrage |
| `treasury/` | le rééquilibrage des soldes |
| `statements/` | la lecture des relevés |
| `instruction/` | la séquence d'exécution |

Règle d'architecture tenue par les deux modules : `pricing` ne connaît pas les
chemins, `router` ne connaît pas les prix. Le prix suit la nature commerciale
de l'opération, jamais le rail technique.

## Les invariants qui coûtent de l'argent

- **Tout montant est un entier XOF.** Le franc CFA n'a pas de centime ; une
  quantité peut être fractionnaire (2,5 kg), un montant jamais. Les totaux
  arrondissent le brut de ligne avant les remises — voir `totals.ts` et la
  régression du 31 août 2026 dans `invoicer.test.ts`.
- **Depuis `submitted`, on ne revient pas en arrière.** Cinq sorties, une
  seule bonne. `uncertain` ne se résout que par un humain ; `unreachable` est
  le seul rejeu automatique. La table est `FNE_TRANSITIONS`, ses règles sont
  testées une à une dans `dgi-adapter.test.ts`.
- **On refuse plutôt que de deviner.** Une saisie douteuse jette une erreur
  typée ; une réponse illisible devient un doute, jamais un succès.

## Commandes

```
npm test          # depuis ce dossier ou la racine — vitest
npm run build     # tsc -b, sort dans dist/ (non versionné)
```

## État d'intégration — à lire avant de s'appuyer dessus

Au 31 août 2026, **aucune app n'importe encore ce paquet** : la logique est
prête et testée (300+ tests), mais elle n'a jamais traité une opération
réelle. Le premier consommateur prévu est l'invoicer derrière `apps/api`.
