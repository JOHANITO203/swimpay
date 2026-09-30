# -*- coding: utf-8 -*-
"""La tontine, version 4 : l'avance garantie. Sonde de docs/pivot/34.

   LE CONSTAT (mesure sur tontine-v3.py) : en v3, le gagnant du tour 1 n'a jamais un
   franc des autres en main. Il a verse 40 000 F, il recupere 35 000 F. La tontine ne
   fait plus credit a personne : c'est une epargne a date tiree au sort, a -3,9 %.

   LA REGLE v4 (la v3 generalisee, une seule formule pour tous) :

       garde  =  max(0, mises restantes - caution - avance)
       rendu  =  tout le reste, tout de suite

   avance = 0 redonne exactement la v3. L'avance est l'argent des autres que le
   gagnant peut avoir en main. Elle se paie, et elle est garantie. Assiette commune :
   l'argent des autres en main, en tours-francs, calculee au gain.

   - le LOYER DU TEMPS : taux x assiette, preleve sur la cagnotte au gain, partage a
     la cloture entre ceux qui ont avance leurs mises, au prorata des tours-francs
     avances. Somme nulle entre membres ;
   - la PRIME DE GARANTIE : taux x assiette, versee au FONDS COMMUN (toutes les
     tontines ensemble). Si un membre cesse de payer : sa part gardee, puis sa
     caution, puis le Fonds paient ses mises. La cagnotte des autres arrive toujours ;
   - la MARGE : taux x assiette, pour SwimPay ;
   - les FRAIS DU SYSTEME : un pourcentage de chaque cagnotte, pour SwimPay, les memes
     pour toutes les places et tous les modes (service, pas credit) ;
   - la PENALITE : 5 % de chaque mise couverte a sa place, versee au Fonds, prise sur
     l'argent du defaillant qui reste a la cloture.

   Le ROBINET (portefeuille) : l'avance accordee aux nouvelles tontines est reduite
   automatiquement pour que  taux de stress x argent avance en cours <= Fonds.
   SwimPay ne peut perdre que sa mise de depart dans le Fonds.

   Tout en entiers XOF ; la conservation de l'argent est verifiee au franc pres."""
import io, sys, random, importlib.util, os

PLEIN = 10 ** 15                                    # avance sans plafond


def en_main_prevue(T, C, caution, t, net, avance):
    """argent des autres en main apres chaque tour u = t .. T-1, pour un gagnant du tour t,
       si toutes ses mises futures sont payees. Sa somme est l'assiette du loyer et de la prime."""
    res = []
    for u in range(t, T):
        held = min(caution, (T - u) * C)
        kept = max(0, (T - u) * C - held - avance)
        res.append(max(0, max(0, net - kept) - u * C - held))
    return res


def joue4(N, T, B, C, R, avance=None, defauts=None):
    """R : reglage {caution (F), loyer, prime, marge (pdb par tour sur l'assiette), frais (pdb de la
       cagnotte), penalite (pdb)}. avance : {place: F}, absent = PLEIN. defauts : {place: premier tour
       manque, sans retour}. La place p gagne au tour p // B + 1."""
    avance = avance or {}; defauts = defauts or {}
    P = range(N); tour_de = lambda p: p // B + 1
    cag = T * C; caution = R["caution"]
    A = {p: avance.get(p, PLEIN) for p in P}
    out = {p: [0] * (T + 1) for p in P}             # ce que le membre verse, tour par tour
    inn = {p: [0] * (T + 1) for p in P}             # ce qu'il recoit
    garde = {p: 0 for p in P}; caut = {p: caution for p in P}
    dette = {p: 0 for p in P}; penal = {p: 0 for p in P}
    a_gagne = {p: False for p in P}; verse_mises = {p: 0 for p in P}; recu_cag = {p: 0 for p in P}
    pret_tf = {p: 0 for p in P}                     # tours-francs de mises avancees au groupe
    loyer_tot = revenu = prime_tot = couvert = rembourse = penal_tot = assiette_tot = loyer_fonds = 0
    fonds_flux = [0] * (T + 1)                      # flux net du Fonds, tour par tour
    expo = [0] * (T + 1)                            # argent des autres en main, total, fin de tour
    for p in P:
        out[p][0] += caution

    def en_defaut(p, t):
        return p in defauts and t >= defauts[p]

    def cible(p, u):
        held = min(caut[p], (T - u) * C)
        return max(0, (T - u) * C - held - A[p])

    def ajuste(p, u):
        if caut[p] > (T - u) * C:
            x = caut[p] - (T - u) * C; caut[p] -= x; inn[p][u] += x
        c = cible(p, u)
        if garde[p] > c:
            x = garde[p] - c; garde[p] -= x; inn[p][u] += x

    for t in range(1, T + 1):
        for p in P:                                  # 1. les mises
            if not en_defaut(p, t):
                out[p][t] += C; verse_mises[p] += C
            else:
                besoin = C
                x = min(garde[p], besoin); garde[p] -= x; besoin -= x
                x = min(caut[p], besoin); caut[p] -= x; besoin -= x
                dette[p] += besoin; couvert += besoin; fonds_flux[t] -= besoin
                penal[p] += C * R["penalite"] // 10000
        for p in P:                                  # 2. le deblocage progressif
            if a_gagne[p] and not en_defaut(p, t):
                ajuste(p, t)
        for g in [p for p in P if tour_de(p) == t]:  # 3. les gagnants
            a_gagne[g] = True
            frais = cag * R["frais"] // 10000
            base = sum(en_main_prevue(T, C, caution, t, cag - frais, A[g]))
            if base > 0 and not R.get("frais_si_avance", True):     # lecture prudente du TAEG
                frais = 0; base = sum(en_main_prevue(T, C, caution, t, cag, A[g]))
            loyer = base * R["loyer"] // 10000
            if en_defaut(g, t):
                # il n'emprunte rien (toute sa cagnotte est gardee) : il ne paie ni loyer, ni prime,
                # ni marge ; le Fonds verse a sa place le loyer promis aux epargnants
                prime = marge = 0; loyer_fonds += loyer; fonds_flux[t] -= loyer
                net = cag - frais
            else:
                prime = base * R["prime"] // 10000; marge = base * R["marge"] // 10000
                assiette_tot += base
                net = cag - frais - loyer - prime - marge
            revenu += frais + marge; loyer_tot += loyer; prime_tot += prime; fonds_flux[t] += prime
            recu_cag[g] += cag                               # la cagnotte entiere lui est attribuee
            if en_defaut(g, t):
                x = min(net, dette[g]); net -= x; dette[g] -= x; rembourse += x; fonds_flux[t] += x
                garde[g] += net
            else:
                rel = max(0, net - cible(g, t)); inn[g][t] += rel
                garde[g] += net - rel
                ajuste(g, t)
        if t < T:                                    # 4. qui a avance ses mises au groupe
            for p in P:
                pret_tf[p] += max(0, verse_mises[p] - recu_cag[p])
                pos = sum(inn[p][:t + 1]) - sum(out[p][:t + 1])
                expo[t] += max(0, pos)
    # cloture : ce qui reste au membre rembourse d'abord le Fonds, puis sa penalite
    for p in P:
        for src in (garde, caut):
            x = min(src[p], dette[p]); src[p] -= x; dette[p] -= x; rembourse += x; fonds_flux[T] += x
            x = min(src[p], penal[p]); src[p] -= x; penal[p] -= x; penal_tot += x; fonds_flux[T] += x
            inn[p][T] += src[p]; src[p] = 0
    tot = sum(pret_tf.values())
    parts = {p: loyer_tot * pret_tf[p] // tot for p in P}
    reste = loyer_tot - sum(parts.values())
    for p in sorted(P, key=lambda q: (-pret_tf[q], q))[:reste]:
        parts[p] += 1
    for p in P:                                      # le loyer du a un defaillant rembourse d'abord le Fonds
        x = min(parts[p], dette[p]); dette[p] -= x; rembourse += x; fonds_flux[T] += x
        inn[p][T] += parts[p] - x
    perte = sum(dette.values())
    assert sum(sum(v) for v in out.values()) + couvert + loyer_fonds == \
        sum(sum(v) for v in inn.values()) + revenu + prime_tot + rembourse + penal_tot, "argent perdu"
    net = {p: sum(inn[p]) - sum(out[p]) for p in P}
    return {"net": net, "out": out, "inn": inn, "revenu": revenu, "prime": prime_tot,
            "perte": perte, "fonds": prime_tot + rembourse + penal_tot - couvert - loyer_fonds,
            "fonds_flux": fonds_flux, "expo": expo, "loyer": loyer_tot, "parts": parts,
            "assiette": assiette_tot}


def taux_annuel(f, lo=-0.04, hi=0.06):
    """taux mensuel qui annule la valeur actuelle, cherche dans une plage realiste
       (-38 % a +101 % par an), converti en taux annuel. None si pas de solution dans la plage."""
    def van(r): return sum(x / (1 + r) ** i for i, x in enumerate(f))
    a, b = van(lo), van(hi)
    if a * b > 0: return None
    for _ in range(100):
        m = (lo + hi) / 2
        if van(lo) * van(m) <= 0: hi = m
        else: lo = m
    return ((1 + (lo + hi) / 2) ** 12 - 1) * 100


def en_main_max(res, p):
    s = m = 0
    for i in range(len(res["inn"][p]) - 1):
        s += res["inn"][p][i] - res["out"][p][i]; m = max(m, s)
    return m


def charge_v3():
    ici = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location("v3", os.path.join(ici, "tontine-v3.py"))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def reglage(caution_mises, loyer, prime, marge, frais, C=10_000):
    return {"caution": caution_mises * C, "loyer": loyer, "prime": prime, "marge": marge,
            "frais": frais, "penalite": 500}


def cout_credit(T, C, R, t, avance=PLEIN):
    """TAEG de l'operation de credit d'un gagnant du tour t : il recoit l'argent des autres, moins
       les charges du credit (loyer, prime, marge), puis le rend mise apres mise. Les frais du
       systeme (service, les memes pour toutes les places et tous les modes) n'y entrent pas."""
    net = T * C - T * C * R["frais"] // 10000
    m = en_main_prevue(T, C, R["caution"], t, net, avance)
    if not m or m[0] <= 0: return None
    charges = sum(m) * (R["loyer"] + R["prime"] + R["marge"]) // 10000
    f = [m[0] - charges] + [m[i] - m[i - 1] for i in range(1, len(m))] + [-m[-1]]
    return taux_annuel(f, -0.04, 0.2)


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    C = 10_000; N, T, B = 10, 10, 1
    v3 = charge_v3()
    rng = random.Random(7)
    PLAFOND = 22.0                                   # TAEG vise, sous le taux d'usure de 24 %

    # 0. la caution de 30 % n'achete aucune securite en v3
    print("0. La v3 avec une caution plus petite (260 cas : formats x scenarios de defaut)")
    for cp in (30, 10, 5):
        perte = lese = fuite = 0
        for n, t_, b in v3.formats():
            base = v3.joue(n, t_, b, C, {}, "v3", cp)[0]
            for ab in v3.scenarios(n, t_, b).values():
                res, pe, _, _, _ = v3.joue(n, t_, b, C, ab, "v3", cp)
                perte = max(perte, pe)
                lese += sum(1 for p in res if p not in ab and res[p] < base[p])
                fuite += sum(1 for p in res if p in ab and res[p] > base[p])
        g = v3.joue(10, 10, 1, C, {}, "v3", cp)[3][0]
        print("   caution %2d %% : perte SwimPay %d, honnetes leses %d, fuites payantes %d ; a l'entree %d F ; rendu au gain, place 1 : %d F"
              % (cp, perte, lese, fuite, cp * 1000 + C, g))

    # 1. le budget du credit sous l'usure : loyer + prime + marge, par mois, au plus
    print("\n1. Budget du credit : charges totales par mois (loyer + prime + marge) pour un TAEG <= %.0f %%" % PLAFOND)
    for fr in (150, 200, 300):
        ok = 0
        for tot in range(10, 400, 5):
            R = reglage(1, tot, 0, 0, fr)
            pire = max(x for x in (cout_credit(T, C, R, t) for t in range(1, T + 1)) if x is not None)
            if pire <= PLAFOND: ok = tot
        R = reglage(1, ok, 0, 0, fr)
        print("   frais du systeme %.1f %% : budget %.2f %% par mois ; TAEG par place : %s"
              % (fr / 100, ok / 100, ", ".join("%.1f" % x for x in (cout_credit(T, C, R, t) for t in range(1, T + 1)) if x is not None)))

    # 2. le partage du budget, et ce que chaque cote y gagne
    print("\n2. Partage du budget (frais du systeme en % de chaque cagnotte ; loyer, prime, marge en % par mois sur l'avance)")
    print("   lecture « service » : les frais du systeme sont un service, hors TAEG")
    print("   frais | loyer prime marge | place 1 : net, TAEG credit, TAEG tout compris | place 10 : net, rendement/an | SwimPay | Fonds | loyer circulant")
    candidats = [(100, 100, 40, 15), (150, 100, 40, 15), (200, 100, 40, 15), (300, 100, 40, 15), (150, 80, 60, 15)]
    for fr, lo, pr, ma in candidats:
        R = reglage(1, lo, pr, ma, fr)
        r = joue4(N, T, B, C, R)
        rend = taux_annuel([r["inn"][9][i] - r["out"][9][i] for i in range(T + 1)])
        taeg = max(x for x in (cout_credit(T, C, R, t) for t in range(1, T + 1)) if x is not None)
        tout = taux_annuel([r["inn"][0][i] - r["out"][0][i] for i in range(T + 1)], -0.04, 0.2)
        print("   %4.1f %% | %4.2f %4.2f %4.2f | %+6d F %5.1f %% %5.1f %% | %+6d F %+5.1f %% | %6d F | %5d F | %6d F"
              % (fr / 100, lo / 100, pr / 100, ma / 100, r["net"][0], taeg, tout, r["net"][9], rend, r["revenu"], r["prime"], r["loyer"]))
    print("   lecture « prudente » : une place qui recoit une avance ne paie pas de frais du systeme, seulement les charges du credit")
    for fr, lo, pr, ma in ((200, 100, 40, 15), (300, 100, 40, 15), (300, 80, 40, 35)):
        R = dict(reglage(1, lo, pr, ma, fr), frais_si_avance=False)
        r = joue4(N, T, B, C, R)
        rend = taux_annuel([r["inn"][9][i] - r["out"][9][i] for i in range(T + 1)])
        tout = taux_annuel([r["inn"][0][i] - r["out"][0][i] for i in range(T + 1)], -0.04, 0.2)
        print("   %4.1f %% | %4.2f %4.2f %4.2f | %+6d F TAEG tout compris place 1 : %5.1f %% | %+6d F %+5.1f %% | %6d F | %5d F | %6d F"
              % (fr / 100, lo / 100, pr / 100, ma / 100, r["net"][0], tout, r["net"][9], rend, r["revenu"], r["prime"], r["loyer"]))

    RV = reglage(1, 100, 40, 15, 150)                # le reglage de reference du document
    # 3. l'exemple de reference, place par place, contre la tontine de quartier et la v3
    print("\n3. Exemple de reference, 10 membres, 10 tours mensuels, 10 000 F. v4 : caution 1 mise, loyer 1 %, prime 0,4 %, marge 0,15 % par mois, frais 1,5 %")
    q = joue4(N, T, B, C, reglage(0, 0, 0, 0, 0)); r3 = v3.joue(N, T, B, C, {}, "v3"); r4 = joue4(N, T, B, C, RV)
    print("   place | quartier : en main max, net | v3 : verse avant gain, rendu au gain, net | v4 : verse avant gain, rendu au gain, en main max, net, TAEG ou rendement")
    for p in range(N):
        if en_main_max(r4, p) > 0:
            info = "TAEG %.1f %%" % cout_credit(T, C, RV, p + 1)
        else:
            tx = taux_annuel([r4["inn"][p][i] - r4["out"][p][i] for i in range(T + 1)])
            info = "rendement %+.1f %%/an" % tx if tx is not None else "—"
        print("   %5d | %6d %6d | %7d %7d %6d | %6d %7d %6d %6d  %s" % (
            p + 1, en_main_max(q, p), q["net"][p], (p + 1) * C + 30_000, r3[3][p], r3[0][p],
            (p + 1) * C + C, r4["inn"][p][p + 1], en_main_max(r4, p), r4["net"][p], info))
    frais_tot = N * T * C * RV["frais"] // 10000
    print("   SwimPay : v3 30 000 F ; v4 %d F (frais %d + marge %d). Fonds : %d F. Loyer entre membres : %d F"
          % (r4["revenu"], frais_tot, r4["revenu"] - frais_tot, r4["prime"], r4["loyer"]))

    # 4. l'avance qui se prouve : la place 1 selon l'avance accordee
    print("\n4. Place 1 selon l'avance accordee")
    for mises in (0, 1, 2, 3, 5, 8):
        r = joue4(N, T, B, C, RV, avance={0: mises * C})
        fu = joue4(N, T, B, C, RV, avance={0: mises * C}, defauts={0: 2})
        print("   avance %d mises : verse %d F, recoit %6d F au gain, en main max %6d F, net honnete %+6d F"
              " | s'il fuit apres son gain : net %+6d F, perte du Fonds %6d F"
              % (mises, 2 * C, r["inn"][0][1], en_main_max(r, 0), r["net"][0], fu["net"][0], fu["perte"]))

    # 5. l'epreuve de la v3 rejouee en v4 : les honnetes ne perdent jamais a cause des autres
    print("\n5. Epreuve v4, avance pleine : tous les formats x 5 scenarios de defaut")
    total = lese = ecart = 0; pire = 0; pire_nom = ""
    for n, t_, b in v3.formats():
        base = joue4(n, t_, b, C, RV)["net"]
        for nom, ab in v3.scenarios(n, t_, b).items():
            d = {p: a[0] for p, a in ab.items() if a[0] <= t_}
            r = joue4(n, t_, b, C, RV, defauts=d)
            total += 1
            if r["fonds"] < pire: pire, pire_nom = r["fonds"], "%s, %d membres, %d tours" % (nom, n, t_)
            for p in r["net"]:
                if p not in d and r["net"][p] < base[p]:
                    lese += 1; ecart = max(ecart, base[p] - r["net"][p])
    print("   cas joues %d ; honnetes perdants a cause des autres : %d (ecart maximal %d F) ; pire resultat du Fonds sur une tontine : %d F (%s)"
          % (total, lese, ecart, pire, pire_nom))

    # 6. la prime qu'il faut au Fonds, selon les defauts
    print("\n6. Prime d'equilibre du Fonds (% par mois de l'avance), 4 000 tontines au hasard par ligne")
    print("   fuite = s'arrete juste apres son gain ; accident = s'arrete a un tour au hasard ; recouvrement = part de la dette recuperee apres")
    R0 = dict(RV, prime=0)
    for av in (None, 3):
        for fuite, acc in ((0.005, 0.02), (0.01, 0.03), (0.02, 0.05), (0.05, 0.05)):
            pertes = ass = 0
            for _ in range(4000):
                d = {}
                for p in range(N):
                    u = rng.random()
                    if u < fuite: d[p] = p // B + 2
                    elif u < fuite + acc: d[p] = rng.randint(2, T)
                a = {p: av * C for p in range(N)} if av is not None else None
                r = joue4(N, T, B, C, R0, avance=a, defauts={p: x for p, x in d.items() if x <= T})
                pertes += -r["fonds"]; ass += r["assiette"]
            print("   avance %-7s fuite %3.1f %%, accident %d %% : prime d'equilibre %.2f %% (recouvrement 0), %.2f %% (recouvrement 30 %%)"
                  % ("pleine" if av is None else "%d mises" % av, fuite * 100, acc * 100,
                     100 * pertes / ass, 100 * pertes * 0.7 / ass))

    # 7. le robinet : 48 mois, croissance, choc x4 des defauts du mois 20 au mois 27
    print("\n7. Le robinet : 48 mois, de 50 a 1 000 nouvelles tontines par mois, fuite 0,5 %, accident 2 %, choc x4 des mois 20 a 27")
    pic = max(joue4(N, T, B, C, RV)["expo"])                 # argent avance au plus fort, une tontine
    def histoire(robinet, mise_depart=5_000_000, stress=15, seed=3):
        rg = random.Random(seed)
        horizon = 48 + T + 1; flux_f = [0] * horizon; expo = [0] * horizon
        fonds = mise_depart; bas = fonds; theta_min = 1.0; normal = []
        for m in range(48):
            fonds += flux_f[m]; bas = min(bas, fonds)
            n_new = 50 + (1000 - 50) * m // 47
            theta = 1.0
            if robinet:
                engage = max(expo[m:m + T])                   # argent deja promis aux tontines en cours
                theta = min(1.0, max(0.0, (fonds * 100 / stress - engage) / (n_new * pic)))
            theta_min = min(theta_min, theta)
            if m >= 6 and not (20 <= m < 34): normal.append(theta)
            choc = 4 if 20 <= m < 28 else 1
            for _ in range(n_new):
                d = {}
                for p in range(N):
                    u = rg.random()
                    if u < 0.005 * choc: d[p] = p // B + 2
                    elif u < 0.025 * choc: d[p] = rg.randint(2, T)
                av = {p: int(theta * max(0, (T - p - 1) * C - C)) for p in range(N)}
                r = joue4(N, T, B, C, RV, avance=av, defauts={p: x for p, x in d.items() if x <= T})
                for t in range(1, T + 1):
                    flux_f[m + t] += r["fonds_flux"][t]
                    if t < T: expo[m + t] += r["expo"][t]
        for m in range(48, horizon):
            fonds += flux_f[m]; bas = min(bas, fonds)
        return fonds, bas, theta_min, (sum(normal) / len(normal) if normal else 1.0)
    print("   regle : n'accorder d'avance nouvelle que si  stress x argent avance en cours et promis <= Fonds")
    for rob, st, dep in ((False, 8, 5_000_000), (True, 8, 5_000_000), (True, 8, 50_000_000), (True, 8, 150_000_000), (True, 15, 150_000_000)):
        f, bas, th, moy = histoire(rob, mise_depart=dep, stress=st)
        print("   robinet %-3s stress %2d %%, depart %11d F : Fonds a la fin %+12d F, point le plus bas %+12d F ; avance accordee : %3d %% en temps normal, %3d %% au plus bas"
              % ("oui" if rob else "non", st, dep, f, bas, moy * 100, th * 100))

    # 9. lecture prudente du TAEG : avance pour la premiere moitie, frais du systeme pour la seconde
    print("\n9. Lecture prudente : avance pour les places 1 a 5 seulement (sans frais du systeme), frais 3 % pour les places 6 a 10")
    R = dict(reglage(1, 100, 40, 15, 300), frais_si_avance=False)
    r = joue4(N, T, B, C, R, avance={p: 0 for p in range(5, 10)})
    ligne = []
    for p in range(N):
        if en_main_max(r, p) > 0:
            ligne.append("p%d %+d F (TAEG %.1f %%)" % (p + 1, r["net"][p], cout_credit(T, C, dict(R, frais=0), p + 1)))
        else:
            tx = taux_annuel([r["inn"][p][i] - r["out"][p][i] for i in range(T + 1)])
            ligne.append("p%d %+d F (%s)" % (p + 1, r["net"][p], "%+.1f %%/an" % tx if tx is not None else "-"))
    print("   SwimPay %d F, Fonds %d F, loyer %d F" % (r["revenu"], r["prime"], r["loyer"]))
    print("   " + " | ".join(ligne))

    # 10. revenu de SwimPay par membre et par an, selon la mise
    print("\n10. Revenu de SwimPay, reglage de reference, selon la mise")
    for mise in (10_000, 25_000, 50_000):
        r = joue4(N, T, B, mise, dict(RV, caution=mise))
        print("   mise %6d F : %6d F par tontine, %6d F par membre et par an (v3 : %6d F)"
              % (mise, r["revenu"], r["revenu"] * 12 // (N * T), 3 * mise * T * N // 100 * 12 // (N * T)))

    # 11. avance nulle = v3 exactement
    r0 = joue4(N, T, B, C, {"caution": 30_000, "loyer": 0, "prime": 0, "marge": 0, "frais": 500, "penalite": 500},
               avance={p: 0 for p in range(N)})
    print("\n11. Avance nulle, caution 30 %%, retenue 5 %% : rendu au gain place 1 = %d F (v3 %d), place 5 = %d F (v3 %d), place 10 = %d F (v3 %d)"
          % (r0["inn"][0][1], r3[3][0], r0["inn"][4][5], r3[3][4], r0["inn"][9][10], r3[3][9]))
