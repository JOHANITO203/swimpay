# Account recovery — scripts d'ops (ponctuels)

Scripts SQL utilisés lors d'une **réparation de comptes marchands Android** : des
comptes dupliqués / orphelins avaient été créés avant un correctif, et il a fallu
consolider le vrai marchand sur la bonne identité Google.

## Diagnostic (lecture seule)
- `diag_account.sql`, `diag_discover.sql`, `diag_fullids.sql` — inventaire des
  marchands / users / devices Android et de leurs liens (Google sub, activité).
- `diag_orphans.sql` … `diag_orphans4.sql` — détection des doublons par identité
  Google, des orphelins, et de l'activité par marchand sur toutes les tables.

## Fusion (écriture)
- `merge_dryrun.sql` — aperçu sûr de la consolidation (rerattache le vrai marchand
  à l'identité Google, re-pointe le device, révoque les sessions périmées,
  **neutralise** les doublons vides par changement de statut — **aucune suppression**).
- `merge_commit.sql` — la version exécutable (`BEGIN … COMMIT`).

> ⚠️ Ces scripts contiennent de **vrais identifiants de production** (UUIDs marchands/
> users/devices, fragments d'emails). Ponctuels, pas du code applicatif. Conservés ici
> comme trace de l'opération. À supprimer une fois la fusion confirmée appliquée.
