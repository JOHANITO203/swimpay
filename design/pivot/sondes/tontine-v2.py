# -*- coding: utf-8 -*-
"""La tontine classique, version 2 (apres les relectures Gemini et DeepSeek, 29/09/2026).

   Regles simulees (doc 31) :
     - caution de 30 % de la cagnotte, versee a l'entree, gelee tout l'evenement ;
     - jour du gain : retrait possible = cotisations deja versees + 5 % de la cagnotte ;
       le reste est BLOQUE et paie les cotisations suivantes EN PREMIER ;
     - frais du systeme 3 % et reserve 2 %, preleves sur la cagnotte au gain ;
     - une cotisation non payee a l'echeance (apres le delai de grace) est couverte,
       dans l'ordre : part bloquee, caution, reserve, avance de SwimPay ;
       chaque franc couvert a sa place coute une penalite de 5 %, versee a la reserve ;
     - le retardataire qui revient rembourse d'abord SwimPay, puis la reserve, puis
       reconstitue sa caution ; ensuite il paie normalement ;
     - SAISIE LIMITEE AU TORT : a la cloture, la part bloquee et la caution d'un
       defaillant remboursent ce qui a ete paye a sa place ; LE RESTE LUI EST RENDU ;
     - l'avance de SwimPay est plafonnee a 2 % de la collecte totale ; au-dela, la part
       manquante de la cagnotte du tour est DIFFEREE : versee au gagnant a la cloture,
       payee par les cagnottes bloquees des defaillants ;
     - a la cloture : bonus de 3 % aux gagnants du dernier tiers, paye par la reserve
       restante, puis la reserve est partagee a parts egales entre les membres qui
       n'ont jamais manque une echeance.
   Tout en entiers XOF ; la conservation de l'argent est verifiee au franc pres."""
import io, sys

N, T, C = 10, 10, 10_000
CAGNOTTE = N * C
CAUTION_PCT, AVANCE_PCT, FRAIS_PCT, RESERVE_PCT, BONUS_PCT, PENALITE_PCT = 30, 5, 3, 2, 3, 5
DERNIERS = range(T - T // 3 + 1, T + 1)

def joue(absences, caution_pct=CAUTION_PCT):
    """absences : {membre: (premier tour manque, tour du retour ou None)}. Le membre i gagne au tour i."""
    M = range(1, N + 1)
    caution0 = CAGNOTTE * caution_pct // 100
    poche_sortie = {i: caution0 for i in M}       # ce qui est sorti de sa poche
    poche_entree = {i: 0 for i in M}              # ce qui est entre dans sa poche
    bloque = {i: 0 for i in M}
    caution = {i: caution0 for i in M}
    dette_reserve = {i: 0 for i in M}             # ce que la reserve a paye pour lui
    dette_swimpay = {i: 0 for i in M}             # ce que SwimPay a avance pour lui
    reserve = revenu = avance_max = 0
    avance_en_cours = 0
    plafond_sw = N * C * T * 2 // 100
    manque_tour = 0                                # ce qui n'a pas pu etre couvert ce tour
    differe = {i: 0 for i in M}                    # part de cagnotte versee a la cloture

    def absent(i, t):
        if i not in absences: return False
        debut, retour = absences[i]
        return t >= debut and (retour is None or t < retour)

    for t in range(1, T + 1):
        # le retardataire qui revient solde ses dettes, dans l'ordre
        for i, (debut, retour) in absences.items():
            if retour == t:
                x = dette_swimpay[i]; poche_sortie[i] += x; dette_swimpay[i] = 0; avance_en_cours -= x
                x = dette_reserve[i]; poche_sortie[i] += x; dette_reserve[i] = 0; reserve += x
                x = caution0 - caution[i]; poche_sortie[i] += x; caution[i] = caution0
        # 1. les cotisations
        manque_tour = 0
        for i in M:
            du = C
            x = min(bloque[i], du); bloque[i] -= x; du -= x          # la part bloquee paie en premier
            if du == 0: continue
            if not absent(i, t):
                poche_sortie[i] += du; continue
            penalite = du * PENALITE_PCT // 100
            besoin = du + penalite
            x = min(caution[i], besoin); caution[i] -= x; besoin -= x
            x2 = min(reserve, besoin); reserve -= x2; besoin -= x2; dette_reserve[i] += x2
            sw = min(besoin, max(0, plafond_sw - avance_en_cours))
            dette_swimpay[i] += sw; avance_en_cours += sw; besoin -= sw
            dette_reserve[i] += besoin; manque_tour += besoin          # non couvert : differe
            reserve += penalite                                        # la penalite va a la reserve
            avance_max = max(avance_max, avance_en_cours)
        # 2. le gagnant du tour
        g = t
        frais = CAGNOTTE * FRAIS_PCT // 100; revenu += frais
        mise = CAGNOTTE * RESERVE_PCT // 100; reserve += mise
        net = CAGNOTTE - frais - mise
        manque = min(manque_tour, reserve + 0) * 0 + manque_tour
        differe[g] += manque; net -= manque
        libre = 0 if absent(g, t) else min(net, C * t + CAGNOTTE * AVANCE_PCT // 100)
        libre = max(0, libre)
        poche_entree[g] += libre
        bloque[g] += net - libre
    # 3. la cloture : saisie limitee au tort
    for i in M:
        x = min(bloque[i], dette_swimpay[i]); bloque[i] -= x; dette_swimpay[i] -= x; avance_en_cours -= x
        x = min(bloque[i], dette_reserve[i]); bloque[i] -= x; dette_reserve[i] -= x; reserve += x
        x = min(caution[i], dette_swimpay[i]); caution[i] -= x; dette_swimpay[i] -= x; avance_en_cours -= x
        x = min(caution[i], dette_reserve[i]); caution[i] -= x; dette_reserve[i] -= x; reserve += x
        poche_entree[i] += bloque[i] + caution[i]; bloque[i] = caution[i] = 0
    for i in M:
        reserve -= differe[i]; poche_entree[i] += differe[i]
    perte_swimpay = sum(dette_swimpay.values())
    impaye_reserve = sum(dette_reserve.values())
    for g in DERNIERS:
        b = min(reserve, CAGNOTTE * BONUS_PCT // 100); reserve -= b; poche_entree[g] += b
    fideles = [i for i in M if i not in absences]
    part, reste = divmod(reserve, len(fideles))
    for k, i in enumerate(fideles):
        poche_entree[i] += part + (1 if k < reste else 0)
    assert sum(poche_sortie.values()) + perte_swimpay == sum(poche_entree.values()) + revenu + 0 * impaye_reserve, "argent perdu"
    net = {i: poche_entree[i] - poche_sortie[i] for i in M}
    return net, revenu, perte_swimpay, avance_max

SCENARIOS = [
    ("A. Tout le monde paie", {}),
    ("B. Retardataire : le membre 6 manque les tours 3 et 4, revient au tour 5", {6: (3, 5)}),
    ("C. Le membre 7, pas encore gagnant, abandonne des le tour 4", {7: (4, None)}),
    ("D. Le gagnant du tour 1 cesse de payer juste apres", {1: (2, None)}),
    ("E. Les 3 premiers gagnants cessent de payer juste apres", {1: (2, None), 2: (3, None), 3: (4, None)}),
    ("F. Les 5 premiers gagnants cessent de payer au tour 6", {i: (6, None) for i in range(1, 6)}),
    ("G. Les 9 premiers cessent de payer juste apres leur gain", {i: (i + 1, None) for i in range(1, 10)}),
    ("H. Tout le monde sauf le dernier abandonne des le tour 2", {i: (2, None) for i in range(1, 10)}),
]

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    for cp in (30, 25):
        print("=" * 80)
        print("CAUTION %d %% (%d F)  avance %d %%  frais %d %%  reserve %d %%  bonus %d %%  penalite %d %%"
              % (cp, CAGNOTTE * cp // 100, AVANCE_PCT, FRAIS_PCT, RESERVE_PCT, BONUS_PCT, PENALITE_PCT))
        for nom, ab in SCENARIOS:
            net, rev, perte, avmax = joue(ab, cp)
            print(nom)
            print("   " + "  ".join("m%d %+d" % (i, net[i]) + ("*" if i in ab else "") for i in net))
            print("   SwimPay : revenu %d F, perte finale %d F, avance maximale en cours %d F" % (rev, perte, avmax))
    print("(* = membre defaillant ou retardataire)")
