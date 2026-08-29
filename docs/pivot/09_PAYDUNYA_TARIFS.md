# PayDunya — grille tarifaire vérifiée

> **Source primaire** : `paydunya.com/service-fees`, page « NOUVEAUX FRAIS
> PAYDUNYA – Standard », relevée le 29 août 2026 avec un Chrome réel (la page
> répond 403 à tout ce qui ressemble à un robot ; capture d'écran conservée dans
> `assets/paydunya-service-fees-2026-08-29.png`). Tout ce qui suit est **[V]**.
>
> Ce document remplace l'estimation `[T]` « PayDunya encaissement ~1,5-3 %, à
> confirmer par devis » de `03_RESEARCH_COMPLETE.md`. La fourchette était juste
> pour le PayIn ; le **PayOut n'était pas chiffré**, et c'est lui qui décide.

## 1. Ce que la page annonce en tête

- **Aucun frais d'abonnement, aucun frais d'installation.**
- Les frais sont **exprimés en pourcentage du montant de la transaction**
  (mention explicite sous les tableaux). Aucune part fixe annoncée.
- Trois paliers de **flux mensuel** : `200 – 99 999 999` · `100 000 000 –
  500 000 000` · `+ de 500 000 000` FCFA.
- **Offre V.I.B** au-delà de **100 000 000 FCFA de flux mensuel** : conditions
  spécifiques, sur contact commercial. Contact CI : +225 05 56 89 38 57.

## 2. Frais PayIn (encaissement)

| Pays | Moyens | 200 – 99,9 M | 100 – 500 M | + 500 M |
|---|---|---|---|---|
| Bénin | Moov Africa, MTN, Celtiis | 2,00 % | 1,85 % | 1,80 % |
| Sénégal | Orange Money, Mixx by Yas, Wizall, Wave | 2,25 % | 2,20 % | 2,15 % |
| Burkina | Orange Money, Moov Africa | 2,25 % | 2,20 % | 2,15 % |
| **Côte d'Ivoire** | **Orange Money, Moov Africa, Wave, MTN** | **2,25 %** | **2,20 %** | **2,15 %** |
| Togo | Mixx by Yas, Moov Africa | 2,25 % | 2,20 % | 2,15 % |
| Cameroun | MTN | 2,00 % | 1,75 % | 1,50 % |
| **Côte d'Ivoire** | **Djamo** | **2,00 %** | **1,75 %** | **1,50 %** |
| Sénégal | Djamo | 2,00 % | 1,75 % | 1,50 % |

**Carte bancaire : 3,50 %**, tous pays, tous paliers.

## 3. Frais PayOut (déboursement)

| Pays | Moyens | 200 – 99,9 M | 100 – 500 M | + 500 M |
|---|---|---|---|---|
| Bénin | Moov Africa, MTN, Celtiis | 1,50 % | 1,25 % | 1,80 % |
| Burkina | Orange Money, Moov Africa | 2,00 % | 1,60 % | 1,50 % |
| **Côte d'Ivoire** | **Orange Money, Moov Africa, Wave, MTN** | **2,00 %** | **1,60 %** | **1,50 %** |
| Togo | Mixx by Yas, Moov Africa | 2,00 % | 1,60 % | 1,50 % |
| Mali | Orange Money | 2,00 % | 1,80 % | 1,50 % |
| Cameroun | MTN | 1,75 % | 1,60 % | 1,40 % |
| **Côte d'Ivoire** | **Djamo** | **1,50 %** | **1,25 %** | **1,00 %** |
| Sénégal | Djamo | 1,50 % | 1,25 % | 1,00 % |
| Sénégal | Orange Money, Mixx by Yas, Wizall, Wave | 2,00 % | 1,95 % | 1,90 % |

## 4. Ce que ces chiffres imposent au produit

### 4.1 Le swap coûte 4,25 %, pas 1,5-2 %

Un swap est un PayIn suivi d'un PayOut. En Côte d'Ivoire, sur Mobile Money, au
premier palier : **2,25 % + 2,00 % = 4,25 %** du montant.

Le red-team de `05_BUILD_STRATEGY.md` estimait « ~1,5-2 % de coût » et concluait
déjà qu'il fallait tuer ou brider le swap. Le vrai chiffre est **plus du double**.
À 0,8 % facturé plafonné 500 F, un swap de 100 000 F coûte 4 250 F et rapporte
500 F : **3 750 F de perte par opération**.

### 4.2 Djamo est le couloir le moins cher

Djamo → Djamo : PayIn 2,00 % + PayOut 1,50 % = **3,50 %** au premier palier,
et **2,50 %** au-delà de 500 M. C'est 0,75 point de moins que le Mobile Money
classique, à volume égal.

### 4.3 Les paliers ne servent qu'à partir de 100 millions par mois

Le premier palier va jusqu'à 99 999 999 FCFA de flux mensuel. Autrement dit,
tant que SwimPay ne fait pas **100 M FCFA de flux par mois**, le tarif ne bouge
pas d'un point. La négociation V.I.B commence au même seuil.

### 4.4 Aucune opération n'est gratuite

La grille publique ne mentionne **aucun** cas à 0 %. Il n'y a ni palier gratuit,
ni opération offerte, ni franchise.

## 5. Les trous de la grille — à demander au commercial

Trois lignes manquent, et chacune décide d'un pan du produit :

1. **`POST /api/v1/direct-pay/credit-account`** (créditer un compte PayDunya,
   endpoint vérifié en primaire dans `02_RAILS_AND_CUSTODY_STRATEGY.md`) n'a
   **aucun tarif publié**. C'est pourtant le pivot de tout le modèle « direct » :
   si créditer un compte PayDunya coûte moins qu'un PayOut Mobile Money, la file
   d'installation a une valeur économique ; si c'est le même prix, elle n'a plus
   qu'une valeur de fiabilité et de KYC.
2. **L'alimentation du compte marchand par virement bancaire** n'est pas dans la
   grille. Une PME qui alimente son compte pour la paie doit-elle payer 2,25 %
   de PayIn, ou peut-elle virer depuis sa banque à moindre coût ? Sur une masse
   salariale de 1 160 000 F, l'écart est de 26 100 F par mois.
3. **Les frais de règlement / retrait** vers le compte bancaire de SwimPay ne
   sont pas publiés non plus.

## 6. Ce qu'il faut demander, mot pour mot

À adresser au service commercial CI (+225 05 56 89 38 57) :

1. Quel est le tarif de `direct-pay/credit-account` (crédit d'un compte PayDunya
   depuis un autre compte PayDunya) ?
2. Un virement bancaire entrant vers notre compte marchand est-il facturé, et à
   quel taux ?
3. Le retrait de notre solde vers notre compte bancaire est-il facturé ?
4. Les paliers de flux mensuel se calculent-ils sur le PayIn seul, le PayOut
   seul, ou le cumul des deux ?
5. Le statut de sous-agrégateur (voir `05_BUILD_STRATEGY.md` S1) change-t-il la
   grille, et à partir de quel volume ?
6. Existe-t-il un tarif de gros pour un lot de paie (N versements en une
   soumission) distinct du tarif unitaire ?
