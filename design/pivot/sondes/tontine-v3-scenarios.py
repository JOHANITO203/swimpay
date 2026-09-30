# -*- coding: utf-8 -*-
"""Les 8 scenarios du 31 §11.1 (A a H, definis dans tontine-v2.py), rejoues avec la
   regle de la v3, a caution 30 % (controle : on doit retrouver la spec) puis 25 %
   (la position figee par LO le 30/09/2026, docs/pivot/35).
   Exemple de reference : 10 membres, 10 tours, 10 000 F. Le membre i de la v2 gagne au
   tour i ; ici la place i - 1."""
import io, sys, os, importlib.util

ici = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("v3", os.path.join(ici, "tontine-v3.py"))
v3 = importlib.util.module_from_spec(spec); spec.loader.exec_module(v3)

SCENARIOS = [
    ("A. Tout le monde paie", {}),
    ("B. Un membre manque 2 echeances puis revient", {6: (3, 5)}),
    ("C. Un membre pas encore gagnant abandonne au tour 4", {7: (4, None)}),
    ("D. Le gagnant du tour 1 cesse de payer", {1: (2, None)}),
    ("E. Les 3 premiers gagnants cessent de payer", {1: (2, None), 2: (3, None), 3: (4, None)}),
    ("F. Les 5 premiers gagnants cessent de payer au tour 6", {i: (6, None) for i in range(1, 6)}),
    ("G. Les 9 premiers cessent de payer apres leur gain", {i: (i + 1, None) for i in range(1, 10)}),
    ("H. Tous sauf le dernier abandonnent des le tour 2", {i: (2, None) for i in range(1, 10)}),
]

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    C = 10_000
    for cp in (30, 25):
        print("=" * 100)
        print("CAUTION %d %%" % cp)
        for nom, ab_v2 in SCENARIOS:
            ab = {i - 1: a for i, a in ab_v2.items()}
            net, perte, avmax, _, expo = v3.joue(10, 10, 1, C, ab, "v3", cp)
            fid = [net[p] for p in net if p not in ab]
            dft = [net[p] for p in net if p in ab]
            print("%-58s | fideles %s | defaillants %s | SwimPay +30 000 F, avance max %d F, perte %d F, en main %d F" % (
                nom,
                ("%d a %d F" % (min(fid), max(fid))) if fid and min(fid) != max(fid) else ("%d F" % fid[0] if fid else "-"),
                ("%d a %d F" % (min(dft), max(dft))) if dft and min(dft) != max(dft) else ("%d F" % dft[0] if dft else "-"),
                avmax, perte, expo))
            if nom.startswith("A") or nom.startswith("G") or nom.startswith("H") or nom.startswith("F"):
                print("      par place : " + ", ".join("%d:%+d" % (p + 1, net[p]) for p in range(10)))
