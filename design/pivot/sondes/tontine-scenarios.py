# -*- coding: utf-8 -*-
"""Le simulateur de la tontine-evenement : tous les formats, tous les pires cas.

   Decision de LO (29/09/2026) : 1, 2 ou 3 gagnants par tour au plus, selon le
   nombre de membres ; un nombre de membres plafonne ; des formats nommes, dont
   les regles sont MAITRISEES avant d'etre proposees. Ce script est l'epreuve de
   maitrise : un format n'entre au catalogue que s'il passe tous les scenarios.

   LES REGLES MATHEMATIQUES
     N membres, T tours, B gagnants par tour, c la cotisation par tour.
       N = B x T                  chaque membre gagne exactement une fois
       B dans {1, 2, 3}
       collecte d'un tour  = N x c
       prise d'un gagnant  = N x c / B = T x c   (= tout ce qu'il cotise)
     Le gagnant tire au tour k doit encore (T - k) x c.

   LE MOTEUR DE RETENUE (la « prise protegee »)
     Le gagnant recoit : prise - retenue. La retenue paie ses cotisations
     restantes, automatiquement. Ce qui n'est couvert ni par sa retenue ni par
     sa caution (une cotisation) est son DECOUVERT. Le decouvert autorise depend
     de son niveau de confiance, et le moteur ne l'accorde que si le filet peut
     le couvrir.

   LE PIRE SCENARIO TESTE
     Une bande : les gagnants des m premiers tours cessent de payer juste apres
     avoir touche. On deroule le temps, tour par tour : a chaque tour, chaque
     cotisation manquante est couverte par la retenue du defaillant, puis sa
     caution, puis le fonds de garantie tel qu'il est A CE MOMENT-LA (il se
     remplit au fil des tours), puis, en dernier recours, SwimPay. Un format est
     « maitrise » si le besoin en dernier recours reste sous le plafond fixe.

   Tout en entiers XOF."""
import io, sys

# ── LE CATALOGUE : les rythmes, et leurs bornes ──────────────────────────────
RYTHMES = {
    #  nom        T min  T max   cotisation min / max
    "Éclair":   (3,     7,      1_000,   25_000),    # un tour par jour, une semaine au plus
    "Relais":   (3,     8,      5_000,   100_000),   # un tour par semaine, deux mois au plus
    "Marathon": (3,     12,     10_000,  200_000),   # un tour par mois, un an au plus
}
TAILLES = [(2, 10, "Cercle"), (11, 20, "Clan"), (21, 30, "Tribu")]   # N min, N max
N_MAX = 30
PLAFOND_SOLDE = 2_000_000          # monnaie electronique, porteur identifie [V]

FRAIS_BP = 100                     # 1 % du tour pour SwimPay (module 13)
FONDS_BP = 100                     # 1 % du tour pour le fonds de garantie (module 7)
DECOUVERT = {"nouveau": 0, "confirme": 1, "fiable": 2}   # decouvert autorise, en cotisations
DERNIER_RECOURS_MAX_BP = 200       # SwimPay ne couvre jamais plus de 2 % de la collecte totale

def gagnants_par_tour(N, tmax):
    """La regle de LO : le moins de gagnants possible, 3 au plus, pour tenir en tmax tours."""
    for B in (1, 2, 3):
        if N % B == 0 and N // B <= tmax:
            return B
    return None

def taille(N):
    for a, b, nom in TAILLES:
        if a <= N <= b:
            return nom

def simule(N, T, B, c, niveau, m):
    """Le pire cas : les gagnants des tours 1..m font defaut juste apres avoir touche.
       Rend (besoin en dernier recours, decouverts accordes)."""
    fonds = 0
    dernier_recours = 0
    defaillants = []                         # [retenue restante, caution restante]
    for k in range(1, T + 1):
        # 1. la collecte : les membres honnetes paient, les defaillants non
        payants = N - len(defaillants) * 1
        fonds += (N * c) * FONDS_BP // 10_000
        # 2. les cotisations manquantes des defaillants, couvertes dans l'ordre
        for d in defaillants:
            manque = c
            prise_retenue = min(d[0], manque); d[0] -= prise_retenue; manque -= prise_retenue
            prise_caution = min(d[1], manque); d[1] -= prise_caution; manque -= prise_caution
            prise_fonds = min(fonds, manque); fonds -= prise_fonds; manque -= prise_fonds
            dernier_recours += manque
        # 3. les gagnants de ce tour : la retenue que le moteur leur impose
        if k <= m:
            reste = (T - k) * c
            autorise = DECOUVERT[niveau] * c
            retenue = max(0, reste - c - autorise)
            for _ in range(B):
                defaillants.append([retenue, c])
    return dernier_recours

def epreuve(N, T, B, c):
    """Passe le format au pire cas, pour chaque niveau de confiance. Rend le niveau
       le plus genereux que le format peut accorder sans depasser le dernier recours."""
    collecte_totale = N * c * T
    plafond_recours = collecte_totale * DERNIER_RECOURS_MAX_BP // 10_000
    accorde = None
    pires = {}
    for niveau in ("nouveau", "confirme", "fiable"):
        # pire bande : jusqu'a un tiers des membres, qui touchent les premiers
        pire = max(simule(N, T, B, c, niveau, m) for m in range(0, max(1, T // 3) + 1))
        pires[niveau] = pire
        if pire <= plafond_recours:
            accorde = niveau
    return accorde, pires, plafond_recours

def formats_permis():
    """Tous les formats que les regles autorisent : (rythme, N, B, T, cotisation min)."""
    out = []
    for rythme, (tmin, tmax, cmin, cmax) in RYTHMES.items():
        for N in range(2, N_MAX + 1):
            B = gagnants_par_tour(N, tmax)
            if B and N // B >= tmin:
                out.append((rythme, N, B, N // B, cmin, cmax))
    return out

def catalogue():
    print("LE CATALOGUE — tous les formats permis, et leur epreuve au pire cas")
    print("(cotisation de reference : le minimum du rythme ; bande = jusqu'a un tiers des tours)")
    refuses = 0
    courant = None
    for rythme, N, B, T, c, cmax in formats_permis():
        if rythme != courant:
            courant = rythme
            tmin, tmax, cmin, _ = RYTHMES[rythme]
            print()
            print("== %s : %d a %d tours, cotisation %d a %d F" % (rythme, tmin, tmax, cmin, cmax))
        accorde, pires, plafond = epreuve(N, T, B, c)
        refuses += accorde is None
        note = "" if T * cmax <= PLAFOND_SOLDE else "  (prise max au-dela de 2 M : versee sur la banque)"
        print("  %-7s N=%2d B=%d T=%2d  prise=%7d F  accorde : %-9s recours au pire n/c/f : %d / %d / %d F (plafond %d)%s" % (
            taille(N), N, B, T, T * c, accorde or "AUCUN", pires["nouveau"], pires["confirme"], pires["fiable"], plafond, note))
    print()
    print("formats refuses (aucun niveau ne passe) :", refuses)

def balayage():
    """Le levier : quelle taille de fonds rend l'avance sure, et pour combien de formats."""
    global FONDS_BP, DERNIER_RECOURS_MAX_BP
    fm = formats_permis()
    print("%d formats permis au total" % len(fm))
    print()
    print("fonds de garantie | recours SwimPay max | un CONFIRME passe | un FIABLE passe")
    for fonds in (100, 200, 300, 500):
        for recours in (0, 200):
            FONDS_BP, DERNIER_RECOURS_MAX_BP = fonds, recours
            conf = fiab = 0
            for rythme, N, B, T, c, cmax in fm:
                acc = epreuve(N, T, B, c)[0]
                conf += acc in ("confirme", "fiable"); fiab += acc == "fiable"
            print("       %d %%        |        %d %%          |   %2d / %d        |   %2d / %d" % (fonds // 100, recours // 100, conf, len(fm), fiab, len(fm)))

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    balayage() if "--balayage" in sys.argv else catalogue()
