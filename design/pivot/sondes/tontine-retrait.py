# -*- coding: utf-8 -*-
"""Regle de LO : le jour du gain, le gagnant retire ce qu'il a deja verse + un bonus
   (en % de la prise) ; le reste paie ses cotisations restantes, automatiquement.
   Pire cas : les gagnants du premier tiers fuient. Qui paie le trou ?"""
import importlib.util, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
spec = importlib.util.spec_from_file_location("s", r"D:\Dev\Projects\swimpay\design\pivot\sondes\tontine-scenarios.py")
s = importlib.util.module_from_spec(spec); spec.loader.exec_module(s)

def simule(N, T, B, c, bonus_bp, m, fonds_bp):
    fonds = 0; recours = 0; fuyards = []
    for k in range(1, T + 1):
        fonds += N * c * fonds_bp // 10_000
        for d in fuyards:
            manque = c
            x = min(d[0], manque); d[0] -= x; manque -= x
            x = min(fonds, manque); fonds -= x; manque -= x
            recours += manque
        if k <= m:
            prise = T * c; reste = (T - k) * c
            libre = k * c + prise * bonus_bp // 10_000     # ce qu'il a verse + bonus
            bloque = max(0, prise - libre)                 # paie ses cotisations restantes
            for _ in range(B): fuyards.append([min(bloque, reste)])
    return recours

print("bonus | fonds | formats ou SwimPay ne paie JAMAIS rien | pire trou pour SwimPay (% collecte)")
for bonus in (500, 1000, 1500):
    for fonds in (100, 200, 300):
        ok = 0; pire = 0
        for r, N, B, T, c, cmax in s.formats_permis():
            tot = N * c * T
            w = max(simule(N, T, B, c, bonus, m, fonds) for m in range(0, max(1, T // 3) + 1))
            ok += w == 0; pire = max(pire, w * 10_000 // tot)
        print(" %2d %% |  %d %%  |            %2d / 48                    |   %d,%02d %%" % (bonus // 100, fonds // 100, ok, pire // 100, pire % 100))

# l'exemple de LO : 10 membres, 10 tours, 10 000 F
T, c = 10, 10_000
print()
print("Exemple de LO, bonus 5 % :")
for k in (1, 3, 5, 8, 10):
    prise = T * c; verse = k * c; libre = verse + prise * 500 // 10_000
    libre = min(libre, prise)
    print("  gagnant du tour %2d : a verse %6d, retire tout de suite %6d, bloque %6d (doit encore %6d)" % (
        k, verse, libre, prise - libre, (T - k) * c))
