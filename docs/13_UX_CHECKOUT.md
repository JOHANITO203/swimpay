# 13 — UX Checkout

## Objective

The checkout must make manual bank transfer feel as close as possible to a modern one-click payment, without pretending to initiate or officially confirm a bank payment.

## Screens

1. Checkout Summary;
2. Buyer Identity;
3. Payment Instructions;
4. Waiting Confirmation;
5. Result.

## Screen 1 — Checkout Summary

Show:

- product name;
- exact amount;
- payment method: bank transfer;
- validity timer;
- status.

Text:

```text
Paiement par transfert bancaire.
SwimPay reconnaît le paiement à partir du signal de réception côté marchand.
```

## Screen 2 — Buyer Identity

Required field:

```text
Numéro utilisé dans votre app bancaire
```

Text:

```text
Ce numéro sert uniquement à reconnaître votre paiement.
SwimPay ne lit pas votre téléphone et ne se connecte pas à votre banque.
```

Optional field:

```text
Nom/prénom utilisé dans la banque
```

## Screen 3 — Payment Instructions

Show:

- exact amount;
- recipient;
- reference code;
- timer;
- copy amount button;
- copy reference button;
- open bank button if available;
- `J’ai payé` button.

Important:

`J’ai payé` never confirms payment. It sets `buyer_claimed_paid`.

## Screen 4 — Waiting Confirmation

Allowed statuses:

- `En attente du transfert`;
- `Recherche du signal bancaire`;
- `Signal détecté`;
- `Vérification SwimPay`;
- `Vérification manuelle nécessaire`;
- `Paiement reconnu`;
- `Commande expirée`.

Forbidden statuses:

- `Confirmé par la banque`;
- `Paiement bancaire officiel confirmé`;
- `Paiement garanti`.

## Screen 5 — Result

Confirmed:

```text
Paiement reconnu par SwimPay.
Produit activé.
```

Review:

```text
Paiement en vérification.
Le marchand doit valider ce paiement.
```

Expired:

```text
Commande expirée.
Créez une nouvelle commande avant de payer.
```

## Returning buyer

If allowed, prefill masked phone:

```text
+7 *** *** **67
```

Never expose full phone in checkout UI unless entered by buyer in the active session.
