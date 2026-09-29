# -*- coding: utf-8 -*-
"""La tontine comme chaine de prets, AVEC la prise protegee (doc 28, 3.1 et 3.2).
   Pour chaque place (tour de tirage) : ce que le membre a en main de l argent
   des autres (dette), et ce que les autres ont en main du sien (creance),
   tour par tour. Puis le loyer du temps : les debiteurs paient taux x dette,
   la somme est partagee entre les creanciers au prorata de leur creance."""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DECOUVERT = {"nouveau": 0, "confirme": 1, "fiable": 2}

def positions(T, c, k, D):
    """Membre tire au tour k, honnete. Rend [(dette, creance)] a la fin de chaque tour."""
    prise = T * c
    reste = (T - k) * c
    retenue = max(0, reste - c - D * c)
    n_retenue = retenue // c                  # cotisations payees par la retenue, juste apres
    verse_cot = 0; recu = 0; caution = c      # caution bloquee a l'entree
    out = []
    for t in range(1, T + 1):
        if t <= k or t > k + n_retenue:       # cotisation payee de sa poche
            verse_cot += c
        if t == k:
            recu += prise - retenue
        # la retenue paie ses cotisations : ni versees de sa poche, ni recues
        dette = max(0, recu - verse_cot - caution)
        creance = max(0, verse_cot - recu)
        out.append((dette, creance))
    return out

def etude(N, T, B, c, niveau, taux_bp):
    D = DECOUVERT[niveau]
    places = {k: positions(T, c, k, D) for k in range(1, T + 1)}
    dette_tf = {k: sum(d for d, _ in places[k]) for k in places}
    creance_tf = {k: sum(cr for _, cr in places[k]) for k in places}
    pot = sum(B * dette_tf[k] * taux_bp // 10_000 for k in places)
    total_creance = sum(B * creance_tf[k] for k in places)
    print("== %s (decouvert %d cotisation(s)), N=%d T=%d B=%d c=%d, taux %.1f %%/tour"
          % (niveau, D, N, T, B, c, taux_bp / 100))
    print("   place | dette tour par tour              | dette tf | creance tf | loyer")
    net_total = 0
    for k in places:
        paie = dette_tf[k] * taux_bp // 10_000
        recoit = pot * creance_tf[k] // total_creance if total_creance else 0
        net = recoit - paie
        net_total += B * net
        print("   %5d | %-32s | %8d | %10d | %+6d" % (
            k, ", ".join(str(d) for d, _ in places[k]), dette_tf[k], creance_tf[k], net))
    print("   somme des loyers (doit etre ~0, arrondis) :", net_total)
    print()

for niveau in ("nouveau", "confirme", "fiable"):
    etude(10, 5, 2, 10_000, niveau, 100)

# sans aucune protection, pour comparer (retenue nulle, caution nulle)
print("== SANS protection (tontine de quartier), meme exemple")
T, c = 5, 10_000
for k in range(1, T + 1):
    recu = 0; verse = 0; dettes = []; creances = []
    for t in range(1, T + 1):
        verse += c
        if t == k: recu += T * c
        dettes.append(max(0, recu - verse)); creances.append(max(0, verse - recu))
    print("   place %d : dette tf %6d | creance tf %6d" % (k, sum(dettes), sum(creances)))
