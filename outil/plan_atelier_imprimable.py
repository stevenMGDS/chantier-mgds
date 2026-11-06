#!/usr/bin/env python3
"""Plan des barres de l'atelier à imprimer (A4 paysage, 3 feuilles).

But : que l'atelier ait sous les yeux les numéros d'emplacement des barres
(D 1 à D 25 debout, RAC 1 à 3 niveaux N1 à N7) pour les noter directement
sur les listes, sans ouvrir l'appli. Pas de contenu ni de quantités : seulement
les emplacements et leurs numéros.

  python3 outil/plan_atelier_imprimable.py

Écrit plan-atelier.html (à imprimer depuis le navigateur : Ctrl+P, A4 paysage).
La géométrie est celle du plan 3D (plan-stock.html) : à reprendre ici si
les zones y bougent.
"""
import datetime
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "plan-atelier.html"

# géométrie du plan 3D (mètres) : X = longueur (0 = quai), Z = profondeur (0 = bardage, P = mur coupe-feu)
L, P = 30.42, 11.24
MZX = L - 9.3          # début de la mezzanine
MZY = 3.0              # hauteur du plancher de la mezzanine
NIV = 7                # bras par rack (N1 en bas → N7 en haut)
MOIS = "janvier février mars avril mai juin juillet août septembre octobre novembre décembre".split()
now = datetime.date.today()
DATE = f"{now.day} {MOIS[now.month-1]} {now.year}"


def page(titre, sous, corps):
    return f'''<section class="feuille">
<header class="ft"><div><span class="marque">MGDS · Atelier · emplacements des barres</span><h2>{titre}</h2></div><p>{sous}</p></header>
{corps}
<footer class="fp"><span>État au {DATE}</span><span>Sur les listes, notez l'emplacement : <b>D 12</b> pour les barres debout, <b>RAC 2 · N4</b> pour les racks.</span></footer>
</section>'''


# ---------------------------------------------------------------- 1. plan de l'atelier (vue de dessus)
def plan_rdc():
    k = 10  # 1 m = 10 unités
    mx, mt, mb = 26, 34, 30
    W, H = L * k + mx + 12, P * k + mt + mb
    g = []
    X = lambda x: mx + x * k  # noqa: E731
    Y = lambda z: mt + z * k  # noqa: E731

    def rect(x0, z0, x1, z1, cls):
        g.append(f'<rect class="{cls}" x="{X(x0):.1f}" y="{Y(z0):.1f}" width="{(x1-x0)*k:.1f}" height="{(z1-z0)*k:.1f}"/>')

    def txt(x, z, t, cls="", anchor="middle", rot=None):
        tr = f' transform="rotate({rot} {X(x):.1f} {Y(z):.1f})"' if rot is not None else ""
        g.append(f'<text class="{cls}" x="{X(x):.1f}" y="{Y(z):.1f}" text-anchor="{anchor}"{tr}>{t}</text>')

    rect(0, 0, L, P, "sol")
    g.append(f'<path class="mur" d="M{X(0)} {Y(0)} H{X(L)} V{Y(P)} H{X(0)}"/>')
    g.append(f'<path class="mur" d="M{X(0)} {Y(0)} V{Y(1.2)} M{X(0)} {Y(5.2)} V{Y(6.2)} M{X(0)} {Y(10.2)} V{Y(P)}"/>')
    for z0 in (1.2, 6.2):
        rect(-0.6, z0, 0, z0 + 4, "porte")
    txt(-1.3, P / 2, "QUAI · portes", "bord", rot=-90)
    txt(L / 2, -1.3, "BARDAGE (mur extérieur)", "bord")
    txt(9, P + 2.0, "↓ Bureaux", "bord")
    txt(25.5, P + 2.0, "↓ Garage / showroom", "bord")
    txt(L / 2 + 1, P + 2.0, "MUR COUPE-FEU", "bord")
    for z in (2.75, 9.9):
        g.append(f'<line class="jaune" x1="{X(1.15)}" y1="{Y(z)}" x2="{X(20.65)}" y2="{Y(z)}"/>')
    x = 0.2
    while x <= L:
        for z in (0.15, P - 0.15):
            rect(x - 0.11, z - 0.11, x + 0.11, z + 0.11, "poteau")
        x += 5.05
    rect(MZX, 0.05, L - 0.05, P - 0.05, "mezz")
    txt(MZX + 0.25, P - 1.0, "MEZZANINE au-dessus", "mz", anchor="start")
    x1, x0 = MZX - 0.01, MZX - 0.15 - 11 * 0.27 - 0.14
    rect(x0, P - 1.1, x1, P - 0.14, "esc")
    for i in range(12):
        xx = MZX - 0.15 - i * 0.27 + 0.14
        g.append(f'<line class="marche" x1="{X(xx):.1f}" y1="{Y(P-1.1):.1f}" x2="{X(xx):.1f}" y2="{Y(P-0.14):.1f}"/>')
    txt(x0 - 0.15, P - 0.45, "Escalier", "pt", anchor="end")
    # barres debout D 1 → D 25
    for i in range(1, 26):
        cx = 20.1 - (i - 1) * 0.74
        rect(cx - 0.31, 0.1, cx + 0.31, 0.6, "zone at")
        txt(cx, 0.48, str(i), "num")
    txt(11.2, 1.25, "BARRES DEBOUT · D 25 ← … → D 1 (gouttière)", "grp")
    rect(9, 1.4, 15, 2.4, "zone at2")
    txt(12, 2.05, "SCIE · débit", "code")
    # racks cantilever sous la mezzanine
    rect(22.4, 1.4, 28.4, 2.45, "zone at")
    rect(22.4, 2.55, 28.4, 3.6, "zone at")
    rect(22.4, 2.45, 28.4, 2.55, "ame")
    rect(22.4, 4.8, 28.4, 5.85, "zone at")
    rect(22.4, 5.85, 28.4, 6.0, "ame bleu")
    for z, t in ((2.08, "RAC 1"), (3.23, "RAC 2"), (5.48, "RAC 3")):
        txt(25.4, z, t, "code")
    txt(25.4, 6.6, "RAC 1 + RAC 2 = rack central double face", "pt")
    txt(25.4, 7.1, "RAC 3 = rack de droite, poteaux bleus", "pt")
    # repère de la vue en coupe (feuille 3)
    g.append(f'<line class="coupe" x1="{X(21.6)}" y1="{Y(0.4)}" x2="{X(21.6)}" y2="{Y(7.4)}"/>')
    txt(21.6, 7.9, "coupe (feuille 3)", "cp")
    return f'<svg class="plan" viewBox="0 0 {W:.0f} {H:.0f}" role="img" aria-label="Plan de l\'atelier">{"".join(g)}</svg>'


def f_ensemble():
    leg = '''<div class="cles">
<div class="cle"><b>D 1 → D 25</b><span>Barres debout contre le bardage, numérotées de <u>droite à gauche</u> en partant de la gouttière (côté mezzanine). Détail : feuille 2.</span></div>
<div class="cle"><b>RAC 1 · 2 · 3</b><span>Racks cantilever sous la mezzanine, 7 bras chacun : N1 en bas → N7 en haut. Détail en coupe : feuille 3.</span></div>
<div class="cle"><b>SCIE</b><span>Barres et chutes posées au poste de débit.</span></div>
</div>'''
    return page("Plan de l'atelier", "vue de dessus · quai à gauche, mezzanine à droite",
                f'<div class="corps">{plan_rdc()}{leg}</div>')


# ---------------------------------------------------------------- 2. mur des barres debout
def f_mur():
    cases = "".join(f'<div class="dcase"><small>D</small><b>{i}</b></div>' for i in range(25, 0, -1))
    corps = f'''<div class="mur-d">
<div class="dmur">{cases}</div>
<div class="sol-d"><span>← côté quai</span><span>SCIE (devant D 8 à D 16)</span><span>gouttière · mezzanine →</span></div>
</div>
<p class="note">Vue depuis l'atelier, face au bardage. <b>D 1</b> est la case la plus à droite (près de la gouttière, côté mezzanine), <b>D 25</b> la plus à gauche (côté quai).</p>'''
    return page("Barres debout · D 1 à D 25", "contre le bardage · vue de face", corps)


# ---------------------------------------------------------------- 3. racks en vue de coupe
def coupe_racks():
    k = 40                     # 1 m = 40 unités
    z0, z1 = -0.3, 7.4         # de part et d'autre : bardage à gauche
    mx, mt, mb = 20, 10, 46
    W, H = (z1 - z0) * k + 2 * mx, (MZY + 0.35) * k + mt + mb
    X = lambda z: mx + (z - z0) * k   # noqa: E731
    Y = lambda y: mt + (MZY + 0.35 - y) * k  # noqa: E731
    g = []

    def rect(za, ya, zb, yb, cls):
        g.append(f'<rect class="{cls}" x="{X(min(za,zb)):.1f}" y="{Y(max(ya,yb)):.1f}" width="{abs(zb-za)*k:.1f}" height="{abs(yb-ya)*k:.1f}"/>')

    def txt(z, y, t, cls="", anchor="middle"):
        g.append(f'<text class="{cls}" x="{X(z):.1f}" y="{Y(y):.1f}" text-anchor="{anchor}">{t}</text>')

    # sol, bardage, plancher de la mezzanine
    rect(z0, -0.12, z1, 0, "sol-c")
    rect(-0.3, 0, 0, MZY + 0.35, "bardage")
    rect(0, MZY, z1, MZY + 0.15, "plancher")
    txt(3.5, MZY + 0.24, "plancher de la mezzanine", "pt-c")
    g.append(f'<text class="bord-c" transform="rotate(-90 {X(-0.5):.1f} {Y(MZY/2):.1f})" x="{X(-0.5):.1f}" y="{Y(MZY/2):.1f}" text-anchor="middle">BARDAGE</text>')
    txt(z1 - 0.05, 1.4, "allée →", "pt-c", anchor="end")

    h_rack, n_y0, n_dy = 2.62, 0.25, 0.36
    racks = [  # (poteau z, côtés : [(code, sens)], classe)
        (2.5, [("RAC 1", -1), ("RAC 2", 1)], "pot"),
        (5.92, [("RAC 3", -1)], "pot bleu"),
    ]
    for zc, cotes, cls in racks:
        rect(zc - 0.07, 0, zc + 0.07, h_rack, cls)                # poteau
        span = [s for _, s in cotes]
        rect(zc - (0.6 if -1 in span else 0.1), 0, zc + (0.6 if 1 in span else 0.1), 0.06, cls)  # pied
        for code, s in cotes:
            bout = zc + s * 1.05
            for n in range(1, NIV + 1):
                y = n_y0 + (n - 1) * n_dy
                y_bout = y + 0.04
                g.append(f'<line class="bras" x1="{X(zc + s*0.07):.1f}" y1="{Y(y):.1f}" x2="{X(bout):.1f}" y2="{Y(y_bout):.1f}"/>')
                g.append(f'<line class="bras" x1="{X(bout):.1f}" y1="{Y(y_bout):.1f}" x2="{X(bout):.1f}" y2="{Y(y_bout+0.07):.1f}"/>')
                # étiquette du niveau au milieu du bras
                lz = zc + s * 0.56
                ly = y + 0.19
                g.append(f'<rect class="et" x="{X(lz)-16:.1f}" y="{Y(ly)-6.5:.1f}" width="32" height="13" rx="2"/>')
                txt(lz, ly - 0.085, f"N{n}", "et-t")
            g.append(f'<rect class="rac-f" x="{X(zc + s*0.56)-20:.1f}" y="{Y(-0.2):.1f}" width="40" height="16" rx="3"/>')
            txt(zc + s * 0.56, -0.48, code, "rac")
    txt(2.5, -0.78, "rack central double face", "pt-c")
    txt(5.92 - 0.56, -0.78, "rack de droite (poteaux bleus)", "pt-c")
    return f'<svg class="coupe-svg" viewBox="0 0 {W:.0f} {H:.0f}" role="img" aria-label="Racks cantilever en vue de coupe">{"".join(g)}</svg>'


def f_racks():
    corps = f'''<div class="corps">{coupe_racks()}
<div class="cles">
<div class="cle"><b>RAC 1 · N1 … N7</b><span>Rack central, bras tournés vers le bardage.</span></div>
<div class="cle"><b>RAC 2 · N1 … N7</b><span>Rack central, bras tournés vers l'allée.</span></div>
<div class="cle"><b>RAC 3 · N1 … N7</b><span>Rack de droite (poteaux bleus), bras tournés vers le rack central.</span></div>
</div></div>'''
    return page("Racks cantilever · vue en coupe", "vus en bout depuis l'atelier (côté escalier) · racks de 6 m · N1 en bas → N7 en haut", corps)


FEUILLES = [f_ensemble(), f_mur(), f_racks()]

CSS = r"""
:root{--ink:#1d2328;--muted:#5b666e;--line:#c5ccd1;--at:#D9772B;--at-d:#8a3f05;--at-l:#FBE6D4;--pose:#2F7FC1;--bg:#E9ECEE;color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font:10pt/1.3 "Barlow","Helvetica Neue",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.barre{position:sticky;top:0;z-index:5;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 16px;background:#fff;border-bottom:1px solid var(--line)}
.barre h1{font:700 20px "Barlow Semi Condensed","Arial Narrow",Arial,sans-serif;margin:0;flex:1 1 auto}
.barre a,.barre button{font:600 14px "Barlow",Arial,sans-serif;border:1.5px solid var(--line);background:#fff;color:var(--ink);padding:6px 14px;border-radius:18px;cursor:pointer;text-decoration:none}
.barre button{background:var(--ink);border-color:var(--ink);color:#fff}
@page{size:A4 landscape;margin:9mm 10mm}
.feuille{width:277mm;height:190mm;margin:14px auto;padding:9mm 10mm;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.12);display:flex;flex-direction:column;box-sizing:content-box;overflow:hidden}
@media print{html,body{background:#fff}.barre{display:none}.feuille{margin:0;padding:0;box-shadow:none;break-after:page}.feuille:last-child{break-after:auto}}
@media screen and (max-width:1100px){.feuille{zoom:.6}}
@media screen and (max-width:640px){.feuille{zoom:.33}}
.ft{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;border-bottom:2.5px solid var(--ink);padding-bottom:4px;margin-bottom:6px}
.ft .marque{font:600 8.5pt "Barlow",Arial,sans-serif;color:var(--at);text-transform:uppercase;letter-spacing:.08em}
.ft h2{font:700 22pt/1 "Barlow Semi Condensed","Arial Narrow",Arial,sans-serif;margin:1px 0 0}
.ft p{margin:0;color:var(--muted);font-size:10pt;text-align:right;max-width:55%}
.fp{display:flex;justify-content:space-between;gap:12px;margin-top:auto;padding-top:4px;border-top:1px solid var(--line);font-size:8pt;color:var(--muted)}
.fp b{color:var(--at-d);font-family:"IBM Plex Mono",monospace}
.corps{flex:1;display:flex;flex-direction:column;gap:8px;min-height:0}
svg{display:block;width:100%;height:auto}
svg text{font-family:"Barlow","Helvetica Neue",Arial,sans-serif;fill:var(--ink)}
.sol{fill:#f6f7f8}.mur{fill:none;stroke:var(--ink);stroke-width:2.2}.porte{fill:#F2C200}
.jaune{stroke:#E0B400;stroke-width:1.4;stroke-dasharray:6 3}.poteau{fill:#7a838a}
.mezz{fill:none;stroke:var(--pose);stroke-width:1.2;stroke-dasharray:5 3}
.esc{fill:#e3e6e8;stroke:#8a9399;stroke-width:.6}.marche{stroke:#8a9399;stroke-width:.5}
.zone.at{fill:var(--at-l);stroke:var(--at);stroke-width:1.1}.zone.at2{fill:#fff;stroke:var(--at);stroke-width:1.1;stroke-dasharray:3 2}
.ame{fill:#2a2f34}.ame.bleu{fill:#1f4f9a}
.coupe{stroke:var(--ink);stroke-width:.8;stroke-dasharray:8 2 2 2}
text.cp{font-size:3.6px;fill:var(--ink);font-style:italic}
text.num{font-size:4.1px;font-weight:700;fill:var(--at-d);letter-spacing:-.02em}
text.code{font:700 6.2px "Barlow Semi Condensed","Arial Narrow",Arial,sans-serif;fill:var(--at-d)}
text.grp{font:700 4.6px "Barlow",Arial,sans-serif;fill:var(--at-d);letter-spacing:.04em}
text.bord{font:600 4.2px "Barlow",Arial,sans-serif;fill:var(--muted);letter-spacing:.12em}
text.pt{font-size:3.6px;fill:var(--muted)}
text.mz{font:700 4.4px "Barlow",Arial,sans-serif;fill:var(--pose)}
.cles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:auto}
.cle{border:1px solid var(--line);border-left:4px solid var(--at);border-radius:4px;padding:6px 10px;font-size:9.5pt;display:flex;flex-direction:column;gap:2px}
.cle b{font:700 14pt "IBM Plex Mono",ui-monospace,Menlo,monospace;color:var(--at-d)}
.note{font-size:10pt;color:var(--muted);margin:6px 0 0;text-align:center}
/* mur des barres debout */
.mur-d{flex:1;display:flex;flex-direction:column;min-height:0;margin-top:4mm}
.dmur{flex:1;display:grid;grid-template-columns:repeat(25,1fr);gap:3px;border-bottom:4px solid var(--ink)}
.dcase{border:2px solid var(--at);border-bottom:0;background:linear-gradient(var(--at-l),#fff 70%);border-radius:3px 3px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:6mm}
.dcase small{font:700 11pt "Barlow Semi Condensed",Arial,sans-serif;color:var(--at)}
.dcase b{font:700 26pt/1 "Barlow Semi Condensed","Arial Narrow",Arial,sans-serif;color:var(--at-d)}
.sol-d{display:flex;justify-content:space-between;font:600 10pt "Barlow",Arial,sans-serif;color:var(--muted);padding-top:4px}
/* coupe des racks */
.coupe-svg{flex:1;min-height:0;width:100%;height:auto;max-height:142mm}
.sol-c{fill:#9aa3a9}.bardage{fill:#c9cfd3}.plancher{fill:#59626b}
.pot{fill:#23272c}.pot.bleu{fill:#1f4f9a}
.bras{stroke:#23272c;stroke-width:3;stroke-linecap:round}
.et{fill:#fff;stroke:var(--at);stroke-width:1.2}
text.et-t{font:700 10px "IBM Plex Mono",monospace;fill:var(--at-d)}
text.rac{font:700 11.5px "Barlow Semi Condensed",Arial,sans-serif;fill:#fff}.rac-f{fill:var(--at)}
text.pt-c{font-size:7px;fill:var(--muted)}
text.bord-c{font:600 8px "Barlow",Arial,sans-serif;fill:var(--muted);letter-spacing:.12em}
"""

HTML = f'''<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Plan des barres à imprimer</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@600;700&family=Barlow:wght@400;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap">
<!-- Généré par outil/plan_atelier_imprimable.py : ne pas modifier à la main. -->
<style>{CSS}</style>
</head>
<body>
<div class="barre"><a href="plan-stock.html">← Plan 3D</a><h1>Emplacements des barres · 3 feuilles A4 paysage</h1><button onclick="print()">🖨 Imprimer</button></div>
{"".join(FEUILLES)}
</body>
</html>
'''

OUT.write_text(HTML, encoding="utf-8")
print(f"{OUT.name} écrit : {len(FEUILLES)} feuilles, état au {DATE}")
