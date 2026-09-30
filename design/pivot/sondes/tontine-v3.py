# -*- coding: utf-8 -*-
"""La tontine classique, version 3 : la regle de retrait qui s'adapte au risque.

   LA FORMULE (une seule, pour tout le monde, quel que soit le nombre de membres) :

       gardé  =  exactement ses mises restantes,
                 pris d'abord sur sa caution, puis sur sa cagnotte si elle ne suffit pas
       rendu  =  tout le reste, tout de suite

   Le jour du gain, le systeme garde ce que le membre doit encore, pas un franc de
   plus. A chaque mise qu'il paie, ce qu'il doit baisse, donc ce qui est garde baisse :
   la difference lui est rendue, tour apres tour.

   Resultat mesure : le jour de son gain, CHAQUE membre, a n'importe quelle place,
   dans une tontine de n'importe quelle taille, se retrouve exactement a -5 % de la
   cagnotte (frais 3 % + reserve 2 %, rendue a la fin). Personne n'a jamais en main
   l'argent des autres : ce qui est garde couvre toujours toutes ses mises restantes.
   La regle s'adapte seule au risque : si sa caution a deja servi (retards non
   rattrapes), on garde davantage de sa cagnotte.

   Les mises d'un gagnant sont payees par lui (solde tontine, puis compte SwimPay).
   La part gardee ne paie une mise que s'il ne la paie pas ; puis sa caution ; puis
   la reserve ; puis SwimPay dans son plafond ; sinon la part est differee.

   Le reste des regles est celui de la version 2 (docs/pivot/31) : caution 30 %,
   frais 3 %, reserve 2 %, bonus 3 % au dernier tiers, penalite 5 %, saisie limitee
   au tort, fideles = membres sans echeance manquee.
   Tout en entiers XOF ; la conservation de l'argent est verifiee au franc pres."""
import io, sys, random

CAUTION_PCT, FRAIS_PCT, RESERVE_PCT, BONUS_PCT, PENALITE_PCT, PLAFOND_SW_PCT = 30, 3, 2, 3, 5, 2

def joue(N, T, B, C, absences, regle="v3", caution_pct=CAUTION_PCT):
    """absences : {place: (premier tour manque, tour du retour ou None)}. La place p gagne au tour p // B + 1."""
    P = range(N)
    tour_de = lambda p: p // B + 1
    cag = T * C
    caution0 = cag * caution_pct // 100
    sortie = {p: caution0 for p in P}; entree = {p: 0 for p in P}
    garde = {p: 0 for p in P}; caution = {p: caution0 for p in P}
    d_res = {p: 0 for p in P}; d_sw = {p: 0 for p in P}; differe = {p: 0 for p in P}
    manquees = {p: 0 for p in P}; libre_gain = {}
    reserve = revenu = avance = avance_max = 0
    plafond = N * C * T * PLAFOND_SW_PCT // 100
    expo_max = 0                                   # le plus d'argent des autres qu'un membre ait eu en main

    def absent(p, t):
        a = absences.get(p)
        return bool(a) and t >= a[0] and (a[1] is None or t < a[1])

    def ajuste(p, t):
        """v3 : apres le tour t, garder EXACTEMENT ses mises restantes, caution d'abord,
           puis une part de cagnotte si la caution ne suffit pas ; rendre tout le reste."""
        restantes = (T - t) * C
        if caution[p] > restantes:
            entree[p] += caution[p] - restantes; caution[p] = restantes
        cible = max(0, restantes - caution[p])
        if garde[p] > cible:
            entree[p] += garde[p] - cible; garde[p] = cible

    def a_garder(p, t):
        """ce que la regle garde apres le tour t (mises restantes : tours t+1..T)"""
        restantes = (T - t) * C
        if regle == "v3": return max(0, restantes - caution[p])
        if regle == "v2": return max(0, restantes - C * 0 - (cag * 10 // 100))   # verse + 5 % (garde = restantes - 10 %)
        return restantes                                                          # tout garder

    for t in range(1, T + 1):
        for p, (debut, retour) in absences.items():
            if retour == t:
                x = d_sw[p]; sortie[p] += x; d_sw[p] = 0; avance -= x
                x = d_res[p]; sortie[p] += x; d_res[p] = 0; reserve += x
                cible = caution0 if (regle != "v3" or tour_de(p) >= t) else min(caution0, (T - t + 1) * C)
                x = max(0, cible - caution[p]); sortie[p] += x; caution[p] += x
        manque = 0
        for p in P:
            if regle != "v3" and garde[p]:                     # v2 et « tout garder » : la part gardee paie d'abord
                x = min(garde[p], C); garde[p] -= x; du = C - x
            else:
                du = C
            if du == 0: continue
            if not absent(p, t):
                sortie[p] += du
            else:
                besoin = du
                x = min(garde[p], besoin); garde[p] -= x; besoin -= x
                x = min(caution[p], besoin); caution[p] -= x; besoin -= x
                x = min(reserve, besoin); reserve -= x; besoin -= x; d_res[p] += x
                x = min(besoin, max(0, plafond - avance)); d_sw[p] += x; avance += x; besoin -= x
                d_res[p] += besoin; manque += besoin
                # la penalite ne se prend que sur l'argent du membre, et seulement sur ce qui
                # depasse ses mises encore a venir : elle ne passe jamais avant ce qu'il doit
                pen = du * PENALITE_PCT // 100
                surplus = max(0, garde[p] + caution[p] - (T - t) * C)
                pen = min(pen, surplus)
                x = min(garde[p], pen); garde[p] -= x; pen -= x; reserve += x
                x = min(caution[p], pen); caution[p] -= x; reserve += x
                manquees[p] += 1
                avance_max = max(avance_max, avance)
        # deblocage progressif (v3) : la part gardee redescend a ce que la regle exige
        if regle == "v3":
            for p in P:
                if not absent(p, t) and tour_de(p) < t and not d_sw[p] and not d_res[p]:
                    ajuste(p, t)
        # les gagnants du tour
        gagnants = [p for p in P if tour_de(p) == t]
        for k, g in enumerate(gagnants):
            frais = cag * FRAIS_PCT // 100; revenu += frais
            mise = cag * RESERVE_PCT // 100; reserve += mise
            net = cag - frais - mise
            part = manque // len(gagnants) + (1 if k < manque % len(gagnants) else 0)
            differe[g] += part; net -= part
            # sa cagnotte rembourse d'abord ses propres dettes, des qu'elle arrive
            x = min(net, d_sw[g]); net -= x; d_sw[g] -= x; avance -= x
            x = min(net, d_res[g]); net -= x; d_res[g] -= x; reserve += x
            libre = 0 if absent(g, t) else max(0, net - a_garder(g, t))
            entree[g] += libre; garde[g] += net - libre; libre_gain[g] = libre
            if regle == "v3" and not absent(g, t) and not d_sw[g] and not d_res[g]:
                avant = entree[g]; ajuste(g, t); libre_gain[g] += entree[g] - avant
        for p in P:
            expo_max = max(expo_max, entree[p] - sortie[p])       # recu moins verse, caution comprise
    # cloture
    for p in P:
        x = min(garde[p], d_sw[p]); garde[p] -= x; d_sw[p] -= x; avance -= x
        x = min(garde[p], d_res[p]); garde[p] -= x; d_res[p] -= x; reserve += x
        x = min(caution[p], d_sw[p]); caution[p] -= x; d_sw[p] -= x; avance -= x
        x = min(caution[p], d_res[p]); caution[p] -= x; d_res[p] -= x; reserve += x
        entree[p] += garde[p] + caution[p]; garde[p] = caution[p] = 0
    for p in P:
        # ce qu'on lui doit (part differee) regle d'abord ce qu'il doit encore
        x = min(differe[p], d_sw[p]); differe[p] -= x; d_sw[p] -= x; avance -= x; reserve -= x
        x = min(differe[p], d_res[p]); differe[p] -= x; d_res[p] -= x
        reserve -= differe[p]; entree[p] += differe[p]
    perte = sum(d_sw.values())
    for p in P:
        if tour_de(p) > T - T // 3:
            b = min(reserve, cag * BONUS_PCT // 100); reserve -= b; entree[p] += b
    fideles = [p for p in P if manquees[p] == 0] or list(P)
    q, r = divmod(reserve, len(fideles))
    for k, p in enumerate(fideles): entree[p] += q + (1 if k < r else 0)
    assert sum(sortie.values()) + perte == sum(entree.values()) + revenu, "argent perdu"
    return {p: entree[p] - sortie[p] for p in P}, perte, avance_max, libre_gain, expo_max

def formats():
    for T in range(2, 31):
        for B in (1, 2, 3):
            if T * B <= 30: yield T * B, T, B

def scenarios(N, T, B):
    tout_gagnant_fuit = {p: (p // B + 2, None) for p in range(N - B)}
    tiers = {p: (p // B + 2, None) for p in range(B * max(1, T // 3))}
    abandon_tot = {p: (2, None) for p in range(N - B)}               # tous arretent au tour 2, sauf les derniers
    moitie_avant = {p: (max(2, p // B), None) for p in range(N // 2, N - B)}
    return {"joyeux": {}, "tiers": tiers, "tous_gagnants_fuient": tout_gagnant_fuit,
            "abandon_tot": abandon_tot, "moitie_avant_gain": moitie_avant}

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    C = 10_000
    # 1. l'exemple de LO : ce que chacun retire le jour du gain, selon la regle
    N, T, B = 10, 10, 1
    print("Exemple : 10 membres, 10 tours, 10 000 F, cagnotte nette 95 000 F, caution 30 000 F")
    print("tour | a verse | v2 (verse+5 %) | tout garder | v3 (formule) | v3 : position le jour du gain")
    g2 = joue(N, T, B, C, {}, "v2")[3]; gA = joue(N, T, B, C, {}, "tout")[3]; g3 = joue(N, T, B, C, {}, "v3")[3]
    for p in range(N):
        print("%4d | %7d | %14d | %11d | %12d | %d" % (p + 1, (p + 1) * C, g2[p], gA[p], g3[p], g3[p] - (p + 1) * C - 30_000))
    # 2. l'epreuve : tous les formats, tous les scenarios
    print()
    pire_perte = 0; pire_expo = 0; lese = 0; fuite_payante = 0; total = 0
    for N, T, B in formats():
        base = joue(N, T, B, C, {}, "v3")[0]
        for nom, ab in scenarios(N, T, B).items():
            res, perte, avmax, _, expo = joue(N, T, B, C, ab, "v3")
            total += 1
            pire_perte = max(pire_perte, perte); pire_expo = max(pire_expo, expo)
            for p in res:
                if p not in ab and res[p] < base[p]: lese += 1                 # un honnete perd a cause des autres
                if p in ab and res[p] > base[p]: fuite_payante += 1            # fuir rapporte
    print("formats x scenarios joues :", total)
    print("perte maximale de SwimPay :", pire_perte, "F")
    print("argent des autres en main, au plus :", pire_expo, "F")
    print("membres honnetes perdants a cause des autres :", lese)
    print("fuites qui rapportent plus que rester honnete :", fuite_payante)
    # 3. equite : a place egale, deux tontines de tailles differentes donnent la meme part
    print()
    for N, T, B in [(10, 10, 1), (20, 10, 2), (30, 10, 3)]:
        g = joue(N, T, B, C, {}, "v3")[3]
        print("N=%2d T=%d B=%d : retirable au tour 1 = %d F, au tour 5 = %d F" % (N, T, B, g[0], g[4 * B]))
