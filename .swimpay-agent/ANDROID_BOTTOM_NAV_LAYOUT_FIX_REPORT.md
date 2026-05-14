# Android Bottom Nav Layout Fix Report

Problem:
- Bottom nav labels were previously at risk of truncation.
- Active content could visually continue behind the nav.
- Selected state felt oversized and disconnected from the premium shell.

Fix:
- Bottom nav now uses the shared `PremiumBottomNavLabel` helper.
- Labels remain: `Accueil`, `En attente`, `Récepteurs`, `Intégrations`, `Paramètres`.
- Nav container is solid dark premium glass instead of translucent over content.
- Active tab bubble was reduced from the oversized state.
- Shell content gets explicit bottom separation before the nav.
- Screen LazyColumns use `PremiumSpacing.ScreenBottomWithNav`.

Result:
- Manual QA screenshots show readable labels and an integrated selected state.
- Remaining risk: very long scroll positions can still place cards near the nav edge, but the nav now masks content cleanly and lists have bottom padding for final items.
