# Courriel à la DGI — demande d'accès à l'environnement de test FNE

> Prêt à envoyer. Destinataires : `support.fne@dgi.gouv.ci`, en copie
> `infos.fne@dgi.gouv.ci`. Téléphone si besoin de relancer : 25 21 01 86 60.
>
> À adapter sur deux points seulement : le nom de l'entreprise et le signataire.
> Le reste est mesuré et doit rester tel quel — c'est ce qui évite trois
> allers-retours.

---

**Objet :** Demande d'accès à l'environnement de test FNE en vue d'un interfaçage par API

Madame, Monsieur,

Nous préparons l'interfaçage par API de notre solution de facturation à la
plateforme FNE, conformément à la procédure publiée par vos services
(« Procédure d'interfaçage des entreprises par API », mai 2025), dont l'étape 1
prévoit l'inscription de l'entreprise sur la plateforme FNE de test.

Nous butons sur cette première étape et souhaitons votre aide.

**Ce que nous observons**, sur `http://54.247.95.108` :

- le formulaire d'inscription `/fr/onboarding` demande le NCC et le numéro de
  télédéclarant ;
- la soumission appelle `POST /ws/auth/preregister` ;
- la réponse est :
  `{"message":"Company not found","error":"company_not_found","statusCode":404}`

Nous avons vérifié qu'il ne s'agit pas d'une indisponibilité du service : une
route volontairement inexistante répond `{"error":"not_found"}`, et
`POST /ws/external/invoices/sign` répond correctement
`{"message":"API Key is required","error":"unauthorized","statusCode":401}`.
**Le service fonctionne** ; c'est notre entreprise qui n'est pas présente dans
le registre de l'environnement de test.

**Notre question, en une phrase :** comment obtient-on un compte d'entreprise sur
l'environnement de test, afin de pouvoir y générer la clé API et réaliser les
tests de génération (vente, avoir, bordereau) prévus à l'étape 4 de la procédure ?

**Trois précisions utiles**, si elles peuvent accélérer votre réponse :

1. Nous n'utiliserons **aucune donnée client réelle** sur cet environnement,
   conformément à vos recommandations : jeux de données fictifs uniquement.
2. Nous préparons en parallèle le dossier d'**agrément éditeur / intégrateur de
   solutions d'interfaçage**, que nous déposerons dès que notre société sera
   immatriculée.
3. Notre solution s'adresse principalement à des entreprises **non assujetties à
   la TVA** (régime de l'entreprenant et régime des microentreprises). Nous
   comprenons du guide d'utilisation que le taux d'imposition à retenir est
   « TVA exo.lég — Pas de TVA sur HT 00,00 % — D (TEE, TCE, Microentreprise) »,
   soit le code `TVAD` de l'API. **Merci de nous le confirmer.**

Nous vous remercions par avance et restons à votre disposition pour tout
complément.

Cordialement,

*[Nom], [fonction]*
*[Entreprise] — [téléphone] — [email]*

---

## Deux questions à poser en second, pas dans ce courriel

Elles n'ont d'intérêt qu'une fois l'accès de test obtenu, et les mettre ici
alourdirait la demande :

1. **L'avertissement de cessation d'activité** (visible dans le formulaire web
   pour un client B2B) remonte-t-il dans la réponse de l'API — vraisemblablement
   par le champ `warning` — et **avant** ou **après** consommation du sticker ?
2. **La consultation d'un NCC** (`e-impots.gouv.ci`, protégée par reCAPTCHA)
   renvoie le statut d'assujettissement à la TVA, l'activité et l'état de
   l'entreprise. Existe-t-il un **accès machine** à ces informations pour un
   éditeur agréé ?

## Ce qui se teste sans eux, en bac à sable, dès l'accès obtenu

- la franchise annoncée sous 5 000 F : émettre une facture à 3 000 F et lire
  `balance_sticker` avant et après ;
- le code `TVAD` sur une facture de microentreprise ;
- une facture émise par un vendeur lui-même au forfait : FNE ou RNE ;
- le comportement sur NCC client invalide : sticker consommé ou non ;
- l'ordre de calcul remise / TVA, avec le cas chiffré du guide
  (1 450 000 HT, 72 500 de remise, 247 950 de TVA).
