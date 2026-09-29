# -*- coding: utf-8 -*-
"""Les scenarios de la tontine, du plus joyeux au pire, avec les regles de LO (29/09) :
     - caution de 35 % de la cagnotte, gelee tout l'evenement, rendue a la fin ;
       celui qui fuit la perd, elle revient aux membres honnetes ;
     - le jour du gain : retrait possible = ce qu'il a verse + 5 % de la cagnotte ;
       le reste est bloque et paie ses cotisations suivantes ;
     - reserve de secours : 2 % de chaque tour, rendue a la fin aux honnetes ;
     - bonus de 3 % de la cagnotte aux gagnants du dernier tiers, paye par le groupe ;
     - celui qui cesse de payer avant de gagner : sa prise paie ses cotisations
       manquees, il perd sa caution, le reste de sa prise lui est rendu a la fin ;
     - frais SwimPay : un % de la cagnotte, preleve au gain.
   Exemple de LO : 10 membres, 10 000 F par tour, 10 tours, cagnotte 100 000 F.
   Tout en entiers XOF. Verifie la conservation de l'argent au franc pres."""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

N, T, C = 10, 10, 10_000
CAGNOTTE = N * C
CAUTION = CAGNOTTE * 35 // 100
AVANCE = CAGNOTTE * 5 // 100
RESERVE_TOUR = CAGNOTTE * 2 // 100
BONUS = CAGNOTTE * 3 // 100
DERNIERS = range(T - T // 3 + 1, T + 1)          # les tours du dernier tiers

def joue(frais_pct, fuite):
    """fuite : {membre: tour apres lequel il cesse de payer}. Le membre i gagne au tour i."""
    verse = {i: 0 for i in range(1, N + 1)}       # sorti de sa poche (cotisations + caution)
    recu = {i: 0 for i in range(1, N + 1)}        # entre dans sa poche
    bloque = {i: 0 for i in range(1, N + 1)}
    caution = {i: CAUTION for i in range(1, N + 1)}
    for i in verse: verse[i] += CAUTION
    reserve = revenu = perte_swimpay = saisi = 0
    couvert = {i: 0 for i in verse}                # ce que la reserve a paye a la place du fuyard
    actif = lambda i, t: i not in fuite or t <= fuite[i]
    for t in range(1, T + 1):
        # 1. les cotisations du tour
        for i in verse:
            du = C
            x = min(bloque[i], du); bloque[i] -= x; du -= x
            if actif(i, t):
                verse[i] += du
            else:                                  # le fuyard : sa caution, puis la reserve, puis SwimPay
                x = min(caution[i], du); caution[i] -= x; saisi += 0; du -= x
                x = min(reserve, du); reserve -= x; du -= x; couvert[i] += x
                perte_swimpay += du
        # 2. le gagnant du tour
        g = t
        reserve += RESERVE_TOUR
        frais = CAGNOTTE * frais_pct // 100
        revenu += frais
        net = CAGNOTTE - RESERVE_TOUR - frais
        # celui qui a cesse de payer avant de gagner ne touche rien : sa prise paie ses cotisations manquees
        libre = min(net, C * t + AVANCE) if actif(g, t) else 0
        recu[g] += libre
        bloque[g] += net - libre
    # 3. la cloture
    honnetes = [i for i in verse if i not in fuite]
    for i in fuite:
        # 1. son bloque rembourse d'abord la reserve de ce qu'elle a paye pour lui
        x = min(bloque[i], couvert[i]); bloque[i] -= x; saisi += x
        # 2. il perd sa caution ; 3. le reste de sa prise lui est rendu
        saisi += caution[i]; caution[i] = 0
        recu[i] += bloque[i]; bloque[i] = 0
    pot = reserve + saisi - BONUS * len(DERNIERS)  # le bonus des derniers, paye par le groupe
    for g in DERNIERS:
        if g not in fuite: recu[g] += BONUS
        else: pot += BONUS
    part, reste = divmod(pot, len(honnetes))
    for k, i in enumerate(honnetes):
        recu[i] += caution[i] + bloque[i] + part + (1 if k < reste else 0)
    # conservation : ce que les membres ont mis = ce qu'ils ont repris + frais - pertes couvertes par SwimPay
    assert sum(verse.values()) + perte_swimpay == sum(recu.values()) + revenu, "argent perdu"
    return {i: recu[i] - verse[i] for i in verse}, revenu, perte_swimpay

SCENARIOS = [
    ("1. Joyeux : tout le monde paie", {}),
    ("2. Un membre pas encore gagnant abandonne au tour 4", {7: 3}),
    ("3. Le gagnant du tour 1 fuit juste apres", {1: 1}),
    ("4. Les 3 premiers gagnants fuient juste apres", {1: 1, 2: 2, 3: 3}),
    ("5. Le pire : les 3 premiers fuient, et un autre abandonne au tour 4", {1: 1, 2: 2, 3: 3, 7: 3}),
]

for frais in (2, 5):
    print("=" * 78)
    print("FRAIS SWIMPAY %d %%   (caution %d F gelee, retrait au gain = verse + %d F)" % (frais, CAUTION, AVANCE))
    for nom, fuite in SCENARIOS:
        nets, revenu, perte = joue(frais, fuite)
        h = [nets[i] for i in nets if i not in fuite]
        print(nom)
        print("   honnetes : " + "  ".join("t%d %+d" % (i, nets[i]) for i in nets if i not in fuite))
        if fuite:
            print("   chaque fuyard  :", ", ".join("%+d F" % nets[i] for i in fuite))
        print("   SwimPay : revenu %d F, perte %d F" % (revenu, perte))
