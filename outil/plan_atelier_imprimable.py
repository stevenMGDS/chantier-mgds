#!/usr/bin/env python3
"""Plan du stock atelier à imprimer (A4 paysage).

Relit les emplacements et leur contenu dans plan-stock.html (constante DATA du plan 3D)
et écrit plan-atelier.html : un dossier de feuilles à imprimer pour l'atelier, sans avoir
à ouvrir l'appli.

  python3 outil/plan_atelier_imprimable.py

À relancer après chaque mise à jour du plan 3D (nouveau relevé), puis imprimer
plan-atelier.html depuis le navigateur (Ctrl+P, A4 paysage, marges par défaut).
"""
import datetime
import html
import json
import pathlib
import re

RACINE = pathlib.Path(__file__).resolve().parent.parent
SRC = RACINE / "plan-stock.html"
OUT = RACINE / "plan-atelier.html"

# --- géométrie reprise du plan 3D (mètres) : X = longueur (0 = quai), Z = profondeur (0 = bardage, P = mur coupe-feu)
L, P = 30.42, 11.24
MZX = L - 9.3                      # début de la mezzanine
ROWS_Z = [1.25, 3.11, 4.97, 6.83, 8.69, 10.62]
MOIS = "janvier février mars avril mai juin juillet août septembre octobre novembre décembre".split()


def lire_data():
    s = SRC.read_text(encoding="utf-8")
    i = s.index("const DATA=") + len("const DATA=")
    data, _ = json.JSONDecoder().raw_decode(s[i:])
    return data


DATA = lire_data()
e = html.escape


def nb(v):
    v = round(float(v), 2)
    return (str(int(v)) if v == int(v) else str(v)).replace(".", ",")


def fusion(items):
    """Regroupe les lignes même réf. + désignation + coloris (barres de plusieurs longueurs)."""
    out = {}
    for it in items:
        ref, nom, col, lg = (it + [0, 0])[:4]
        k = (ref or "", nom or "", col or "")
        out.setdefault(k, [])
        if lg:
            out[k].append(float(lg))
    return [(r, n, c, sorted(set(ls), reverse=True)) for (r, n, c), ls in out.items()]


def ligne(ref, nom, col, lgs, court=False):
    nom = re.sub(r"\s+", " ", nom).strip()
    if ref and nom.lower() in ("article " + ref.lower(), ""):
        nom = ""
    if court and len(nom) > 34:
        nom = nom[:32].rstrip() + "…"
    bits = []
    if ref:
        bits.append(f'<b class="ref">{e(ref)}</b>')
    if nom:
        bits.append(e(nom))
    if col:
        bits.append(f'<span class="clr">{e(col)}</span>')
    if lgs:
        bits.append(f'<span class="lg">{" · ".join(nb(x) for x in lgs)} m</span>')
    return " ".join(bits)


def liste(items, court=False):
    f = fusion(items)
    if not f:
        return '<p class="vide">à relever</p>'
    return "<ul>" + "".join(f"<li>{ligne(*x, court=court)}</li>" for x in f) + "</ul>"


def page(titre, sous, corps, cls=""):
    return f'''<section class="feuille {cls}">
<header class="ft"><div><span class="marque">MGDS · Stock atelier</span><h2>{titre}</h2></div><p>{sous}</p></header>
{corps}
<footer class="fp"><span>État au {DATE}</span><span>Le contenu évolue : en cas de doute, l'appli fait foi (onglet Stock › Plan 3D).</span></footer>
</section>'''


# ---------------------------------------------------------------- plan du rez-de-chaussée
def plan_rdc():
    k = 10  # 1 m = 10 unités
    mx, mt, mb = 26, 34, 30
    W, H = L * k + mx + 12, P * k + mt + mb
    g = []
    X = lambda x: mx + x * k  # noqa: E731
    Y = lambda z: mt + z * k  # noqa: E731

    def rect(x0, z0, x1, z1, cls, extra=""):
        g.append(f'<rect class="{cls}" x="{X(x0):.1f}" y="{Y(z0):.1f}" width="{(x1-x0)*k:.1f}" height="{(z1-z0)*k:.1f}" {extra}/>')

    def txt(x, z, t, cls="", anchor="middle", rot=None):
        tr = f' transform="rotate({rot} {X(x):.1f} {Y(z):.1f})"' if rot is not None else ""
        g.append(f'<text class="{cls}" x="{X(x):.1f}" y="{Y(z):.1f}" text-anchor="{anchor}"{tr}>{t}</text>')

    # sol + murs (quai ouvert à gauche)
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
    # allée (lignes jaunes)
    for z in (2.75, 9.9):
        g.append(f'<line class="jaune" x1="{X(1.15)}" y1="{Y(z)}" x2="{X(20.65)}" y2="{Y(z)}"/>')
    # poteaux de charpente (repères)
    x = 0.2
    while x <= L:
        for z in (0.15, P - 0.15):
            rect(x - 0.11, z - 0.11, x + 0.11, z + 0.11, "poteau")
        x += 5.05
    # mezzanine au-dessus
    rect(MZX, 0.05, L - 0.05, P - 0.05, "mezz")
    txt(MZX + 0.25, P - 1.5, "MEZZANINE au-dessus", "mz", anchor="start")
    txt(MZX + 0.25, P - 0.6, "(voir plan de l'étage)", "mz2", anchor="start")
    # escalier
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
    # scie
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
    # armoire consommables, étagère de vis
    rect(20.2, 8.45, 21.0, 9.75, "zone at")
    txt(20.6, 9.3, "CA", "code")
    txt(19.95, 9.15, "Consommables atelier", "pt", anchor="end")
    rect(13.3, P - 0.6, 15.7, P - 0.1, "zone at")
    txt(14.5, P - 0.22, "VIS", "code")
    txt(14.5, P - 0.95, "Étagère de vis", "pt")
    # flèche nord-ish : rappel orientation
    return f'<svg class="plan" viewBox="0 0 {W:.0f} {H:.0f}" role="img" aria-label="Plan du rez-de-chaussée de l\'atelier">{"".join(g)}</svg>'


# ---------------------------------------------------------------- plan de la mezzanine
def stock_rangee(r, sd):
    if r == 6 or (r == 5 and sd == "B"):
        return "hors"
    return "at" if r >= 3 else "pose"


def plan_mezz():
    k = 16
    mx, mt = 70, 40
    x0 = MZX
    W, H = (L - x0) * k + mx + 20, P * k + mt + 30
    g = []
    X = lambda x: mx + (x - x0) * k  # noqa: E731
    Y = lambda z: mt + z * k  # noqa: E731

    def rect(xa, za, xb, zb, cls):
        g.append(f'<rect class="{cls}" x="{X(xa):.1f}" y="{Y(za):.1f}" width="{(xb-xa)*k:.1f}" height="{(zb-za)*k:.1f}"/>')

    def txt(x, z, t, cls="", anchor="middle"):
        g.append(f'<text class="{cls}" x="{X(x):.1f}" y="{Y(z):.1f}" text-anchor="{anchor}">{t}</text>')

    rect(x0, 0, L, P, "sol")
    g.append(f'<path class="mur" d="M{X(x0)} {Y(0)} H{X(L)} V{Y(P)} H{X(x0)}"/>')
    g.append(f'<line class="garde" x1="{X(x0)}" y1="{Y(0.1)}" x2="{X(x0)}" y2="{Y(P-1.4)}"/>')
    txt((x0 + L) / 2, -0.9, "BARDAGE", "bord")
    txt((x0 + L) / 2, P + 1.2, "MUR COUPE-FEU", "bord")
    txt(x0 - 0.3, 3.2, "garde-corps", "pt", anchor="end")
    txt(x0 - 0.3, 3.9, "(vide sur atelier)", "pt", anchor="end")
    rect(x0 - 0.9, P - 1.1, x0, P - 0.14, "esc")
    txt(x0 - 0.3, P - 1.5, "escalier", "pt", anchor="end")
    for t in range(1, 6):
        txt(24.3 + (t - 0.5) * 1.21, -0.25, f"T{t}", "tv")
    for r, z in enumerate(ROWS_Z, start=1):
        one = r == 6
        d = 0.4 if one else 0.8
        nt = 4 if r == 5 else 5
        for si, sd in enumerate([""] if one else ["A", "B"]):
            zc = z if one else z + (d / 4 if si else -d / 4)
            dd = d if one else d / 2 - 0.03
            st = stock_rangee(r, sd)
            for t in range(1, nt + 1):
                cx = 24.3 + (t - 0.5) * 1.21
                rect(cx - 0.585, zc - dd / 2, cx + 0.585, zc + dd / 2, f"zone {st}")
                if not one:
                    txt(cx, zc + 0.12, f"M{r}{sd}.{t}", "cm " + st)
            if not one:
                txt(x0 + 2.95, zc + 0.12, sd, "sd")
        txt(x0 + 2.3, z + 0.17, f"M{r}", "rg " + ("at" if r in (3, 4, 5) else "pose" if r < 3 else "hors"))
        if one:
            txt(26.9, z - 0.35, "contre le mur · hors stock", "cm hors")
    return f'<svg class="plan mz" viewBox="0 0 {W:.0f} {H:.0f}" role="img" aria-label="Plan de la mezzanine">{"".join(g)}</svg>'


# ---------------------------------------------------------------- feuilles
def f_ensemble():
    leg = '''<div class="leg">
<div><i class="sw at"></i><b>Stock atelier</b> (production : barres, accessoires de fabrication)</div>
<div><i class="sw mezz"></i>Mezzanine au-dessus (étagères, voir feuille suivante)</div>
<div><i class="sw jaune"></i>Lignes jaunes de l'allée</div>
</div>
<div class="cles">
<div class="cle"><b>D 7</b><span>Barres debout n° 7 (contre le bardage, numérotées de <u>droite à gauche</u> depuis la gouttière)</span></div>
<div class="cle"><b>RAC 2.N4</b><span>Rack cantilever 2, bras n° 4 (N1 en bas → N7 en haut)</span></div>
<div class="cle"><b>M4B.3.2</b><span>Mezzanine, rangée 4, côté B, travée 3, niveau 2 (N1 en bas)</span></div>
<div class="cle"><b>CA.2 · VIS.5</b><span>Armoire consommables / étagère de vis, niveau 2 / 5</span></div>
</div>'''
    return page("Plan de l'atelier · rez-de-chaussée", "vue de dessus · quai à gauche, mezzanine à droite", f'<div class="corps">{plan_rdc()}{leg}</div>')


def f_mezz():
    side = '''<div class="aside">
<h3>Lire un code</h3>
<p class="big"><b>M4B.3.2</b></p>
<table class="dec"><tr><td><b>M4</b></td><td>rangée 4 (M1 côté bardage → M6 contre le mur coupe-feu)</td></tr>
<tr><td><b>B</b></td><td>côté de la rangée : <b>A</b> = face tournée vers le bardage, <b>B</b> = face tournée vers le mur coupe-feu</td></tr>
<tr><td><b>3</b></td><td>travée 3 (T1 près du garde-corps → T5 au fond)</td></tr>
<tr><td><b>2</b></td><td>niveau 2 (N1 en bas → N6 en haut)</td></tr></table>
<h3>Couleurs</h3>
<div class="leg col"><div><i class="sw at"></i><b>Atelier</b> : M3 (joints), M4, M5 côté A (accessoires)</div>
<div><i class="sw pose"></i>Pose : M1, M2 (non détaillé ici)</div>
<div><i class="sw hors"></i>Hors stock : M5 côté B, M6</div></div>
<p class="note">Le détail de chaque face (travées × niveaux) est sur les feuilles suivantes : une feuille par face, à afficher au bout de la rangée.</p>
</div>'''
    return page("Plan de la mezzanine", "vue de dessus · étagères 1210 × 800, 6 niveaux", f'<div class="corps deux">{plan_mezz()}{side}</div>')


def f_barres():
    cases = []
    for i in range(25, 0, -1):
        n = len(fusion(DATA.get(f"D {i}", [])))
        cases.append(f'<div class="dcase{" vide" if not n else ""}"><b>{i}</b><small>{n or "–"}</small></div>')
    bande = f'''<div class="bande"><span class="fl">← côté quai</span><div class="dmur">{"".join(cases)}</div><span class="fl">gouttière →</span></div>
<p class="note c">Vue depuis l'atelier, face au bardage. Le petit chiffre = nombre de références dans la case.</p>'''
    blocs = []
    for i in range(1, 26):
        it = DATA.get(f"D {i}", [])
        blocs.append(f'<div class="bloc"><h4><span class="tag">D {i}</span></h4>{liste(it)}</div>')
    return page("Barres debout · D 1 à D 25", "contre le bardage · longueurs en mètres",
                f'{bande}<div class="cols3">{"".join(blocs)}</div>', "flux")


def f_racks():
    cols = []
    for t in (1, 2, 3):
        cells = []
        for n in range(7, 0, -1):
            it = DATA.get(f"RAC.{t}.{n}", [])
            cells.append(f'<div class="niv"><span class="nl">N{n}</span><div>{liste(it, court=True) if it else "<p class=vide>à relever</p>"}</div></div>')
        nm = {1: "rack central · face côté bardage", 2: "rack central · face côté allée", 3: "rack de droite · poteaux bleus"}[t]
        cols.append(f'<div class="rack"><h4><span class="tag">RAC {t}</span> {nm}</h4>{"".join(cells)}</div>')
    libre = DATA.get("RAC", [])
    extra = ""
    if libre:
        extra += f'<div class="bloc"><h4>Noté « RAC » sans position</h4>{liste(libre)}</div>'
    extra += f'<div class="bloc"><h4><span class="tag">SCIE</span> au poste de débit</h4>{liste(DATA.get("SCIE", []))}</div>'
    return page("Racks cantilever · RAC 1, 2, 3", "sous la mezzanine · barres couchées de 6 m · N1 en bas → N7 en haut",
                f'<div class="racks">{"".join(cols)}</div><div class="cols2 bas">{extra}</div>')


def f_face(r, sd):
    nt = 4 if r == 5 else 5
    order = [nt - i for i in range(nt)] if sd == "A" else list(range(1, nt + 1))
    code = f"M{r}{sd}"
    head = '<div class="gh"></div>' + "".join(f'<div class="gh">Travée {t}</div>' for t in order)
    rows = []
    for n in range(6, 0, -1):
        rows.append(f'<div class="gn">N{n}</div>')
        for t in order:
            it = DATA.get(f"{code}.{t}.{n}", [])
            c = f'<span class="cc">{code}.{t}.{n}</span>'
            if not it:
                rows.append(f'<div class="gc vide">{c}</div>')
                continue
            f = fusion(it)
            dense = len(f) > 4
            if dense:
                inner = '<p class="dense">' + ", ".join(f'<b>{e(x[0])}</b>' if x[0] else e(x[1]) for x in f) + "</p>"
            else:
                inner = liste(it, court=True)
            rows.append(f'<div class="gc">{c}{inner}</div>')
    vu = "bardage" if sd == "A" else "mur coupe-feu"
    contenu = {3: "joints (cartons et rouleaux Hydro / Technal), réservations chantiers, chutes",
               4: "accessoires de fabrication (bouchons, équerres, ferrures, joints…)",
               5: "accessoires et quincaillerie"}[r]
    grid = f'<div class="grille" style="grid-template-columns:34px repeat({nt},1fr)">{head}{"".join(rows)}</div>'
    return page(f"Mezzanine · rangée {r} côté {sd}",
                f"face tournée vers le {vu}, vue depuis l'allée · {contenu}", grid, "flux")


def f_meubles():
    def meuble(code, nom, nlv, sous):
        cells = []
        for n in range(nlv, 0, -1):
            it = DATA.get(f"{code}.{n}", [])
            it = [[x[0], re.sub(r"\s*·\s*case\s*\d+", "", x[1])] + x[2:] for x in it]
            cells.append(f'<div class="niv"><span class="nl">{code}.{n}</span><div>{liste(it, court=True)}</div></div>')
        return f'<div class="rack"><h4><span class="tag">{code}</span> {nom}</h4><p class="note">{sous}</p>{"".join(cells)}</div>'
    return page("Armoire consommables · étagère de vis", "niveau 1 en bas",
                '<div class="racks deux">' + meuble("CA", "Consommables atelier", 3, "armoire bois au pied de l'escalier : mastics, colles, nettoyants")
                + meuble("VIS", "Étagère de vis", 7, "contre le mur parpaing, le long du bureau") + "</div>")


def emplacement_lisible(k):
    m = re.match(r"(M\d[AB]?)\.(\d)\.(\d)$", k)
    if m:
        return k
    m = re.match(r"RAC\.(\d)\.(\d)$", k)
    if m:
        return f"RAC {m.group(1)}.N{m.group(2)}"
    return k


def f_index():
    idx = {}
    for k, items in DATA.items():
        if not (k.startswith(("D ", "RAC", "SCIE", "CA", "VIS")) or re.match(r"M[345]", k)):
            continue
        for it in items:
            ref = (it[0] or "").strip()
            if not ref or not re.search(r"\d", ref):
                continue
            nom = re.sub(r"\s*·\s*(case\s*\d+|réservé.*|chute)$", "", it[1] or "").strip()
            d = idx.setdefault(ref, [nom, set()])
            if not d[0] or d[0].lower().startswith("article"):
                d[0] = nom
            d[1].add(emplacement_lisible(k))

    def tri(z):
        m = re.match(r"D (\d+)", z)
        return (0, int(m.group(1)), "") if m else (1, 0, z)
    lignes = []
    for ref in sorted(idx, key=lambda r: re.sub(r"^T", "", r).upper()):
        nom, z = idx[ref]
        if nom.lower() in ("article " + ref.lower(), ref.lower()):
            nom = ""
        if len(nom) > 30:
            nom = nom[:28].rstrip() + "…"
        lignes.append(f'<li><b class="ref">{e(ref)}</b> <span class="nm">{e(nom)}</span> <span class="em">{" · ".join(e(x) for x in sorted(z, key=tri))}</span></li>')
    return page("Index des références → emplacement", f"{len(idx)} références atelier · triées sans le « T » initial (T141001 est classé à 141001)",
                f'<ul class="index">{"".join(lignes)}</ul>', "flux")


now = datetime.date.today()
DATE = f"{now.day} {MOIS[now.month-1]} {now.year}"

FEUILLES = [f_ensemble(), f_mezz(), f_barres(), f_racks()]
for r in (3, 4, 5):
    for sd in ("A", "B"):
        if r == 5 and sd == "B":
            continue
        FEUILLES.append(f_face(r, sd))
FEUILLES += [f_meubles(), f_index()]

CSS = r"""
:root{--ink:#1d2328;--muted:#5b666e;--line:#c5ccd1;--at:#D9772B;--at-l:#FBE6D4;--pose:#2F7FC1;--pose-l:#DCEAF6;--hors:#9aa3a9;--bg:#E9ECEE;--paper:#fff;color-scheme:light}
*{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;background:var(--bg);color:var(--ink);font:10pt/1.3 "Barlow","Helvetica Neue",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.barre{position:sticky;top:0;z-index:5;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 16px;background:#fff;border-bottom:1px solid var(--line)}
.barre h1{font:700 20px "Barlow Semi Condensed","Arial Narrow",Arial,sans-serif;margin:0;flex:1 1 auto}
.barre a,.barre button{font:600 14px "Barlow",Arial,sans-serif;border:1.5px solid var(--line);background:#fff;color:var(--ink);padding:6px 14px;border-radius:18px;cursor:pointer;text-decoration:none}
.barre button{background:var(--ink);border-color:var(--ink);color:#fff}
.barre p{margin:0;width:100%;font-size:13px;color:var(--muted)}
@page{size:A4 landscape;margin:9mm 10mm}
.feuille{width:277mm;min-height:190mm;margin:14px auto;padding:9mm 10mm;background:var(--paper);box-shadow:0 2px 14px rgba(0,0,0,.12);display:flex;flex-direction:column;box-sizing:content-box}
.feuille:not(.flux){height:190mm}
@media print{html,body{background:#fff}.barre{display:none}.feuille{margin:0;padding:0;box-shadow:none;width:auto;break-after:page}.feuille:not(.flux){height:190mm;overflow:hidden}.feuille:last-child{break-after:auto}}
@media screen and (max-width:1100px){.feuille{zoom:.6}}
@media screen and (max-width:640px){.feuille{zoom:.33}}
.ft{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;border-bottom:2.5px solid var(--ink);padding-bottom:4px;margin-bottom:6px}
.ft .marque{font:600 8.5pt "Barlow",Arial,sans-serif;color:var(--at);text-transform:uppercase;letter-spacing:.08em}
.ft h2{font:700 20pt/1 "Barlow Semi Condensed","Arial Narrow",Arial,sans-serif;margin:1px 0 0}
.ft p{margin:0;color:var(--muted);font-size:9.5pt;text-align:right;max-width:55%}
.fp{display:flex;justify-content:space-between;gap:12px;margin-top:auto;padding-top:4px;border-top:1px solid var(--line);font-size:7.5pt;color:var(--muted)}
.flux .fp{margin-top:8px}
.corps{flex:1;display:flex;flex-direction:column;gap:6px;min-height:0}
.corps.deux{flex-direction:row;gap:8mm}
svg.plan{width:100%;height:auto;display:block}
svg.plan.mz{height:100%;width:auto;max-width:62%}
svg text{font-family:"Barlow","Helvetica Neue",Arial,sans-serif;fill:var(--ink)}
.sol{fill:#f6f7f8}.mur{fill:none;stroke:var(--ink);stroke-width:2.2}.porte{fill:#F2C200}
.jaune{stroke:#E0B400;stroke-width:1.4;stroke-dasharray:6 3}.poteau{fill:#7a838a}
.mezz{fill:none;stroke:var(--pose);stroke-width:1.2;stroke-dasharray:5 3}
.esc{fill:#e3e6e8;stroke:#8a9399;stroke-width:.6}.marche{stroke:#8a9399;stroke-width:.5}
.zone{stroke:var(--ink);stroke-width:.7}.zone.at{fill:var(--at-l);stroke:var(--at);stroke-width:1.1}.zone.at2{fill:#fff;stroke:var(--at);stroke-width:1.1;stroke-dasharray:3 2}
.zone.pose{fill:var(--pose-l);stroke:var(--pose)}.zone.hors{fill:#eceeef;stroke:var(--hors);stroke-dasharray:2 2}
.ame{fill:#2a2f34}.ame.bleu{fill:#1f4f9a}
text.num{font-size:4.1px;letter-spacing:-.02em;font-weight:700;fill:var(--at)}
text.code{font:700 6.2px "Barlow Semi Condensed","Arial Narrow",Arial,sans-serif;fill:#8a3f05}
text.grp{font:700 4.6px "Barlow",Arial,sans-serif;fill:#8a3f05;letter-spacing:.04em}
text.bord{font:600 4.2px "Barlow",Arial,sans-serif;fill:var(--muted);letter-spacing:.12em}
text.pt{font-size:3.6px;fill:var(--muted)}
text.mz{font:700 4.4px "Barlow",Arial,sans-serif;fill:var(--pose)}text.mz2{font-size:3.6px;fill:var(--pose)}
svg.mz text.bord{font-size:4.8px}svg.mz text.pt{font-size:4.2px}
text.tv{font:700 5.4px "Barlow",Arial,sans-serif;fill:var(--muted)}
text.cm{font:600 3.9px "IBM Plex Mono",ui-monospace,Menlo,monospace}text.cm.at{fill:#8a3f05}text.cm.pose{fill:#1d5a8f}text.cm.hors{fill:var(--hors);font-family:"Barlow",Arial,sans-serif}
text.sd{font:700 4.8px "Barlow",Arial,sans-serif;fill:var(--muted)}
text.rg{font:700 9px "Barlow Semi Condensed","Arial Narrow",Arial,sans-serif}text.rg.at{fill:var(--at)}text.rg.pose{fill:var(--pose)}text.rg.hors{fill:var(--hors)}
.garde{stroke:#E0B400;stroke-width:2}
.leg{display:flex;gap:6px 22px;flex-wrap:wrap;font-size:9pt}.leg.col{flex-direction:column}
.sw{display:inline-block;width:14px;height:10px;margin-right:6px;vertical-align:-1px;border:1.2px solid}
.sw.at{background:var(--at-l);border-color:var(--at)}.sw.pose{background:var(--pose-l);border-color:var(--pose)}.sw.hors{background:#eceeef;border-color:var(--hors);border-style:dashed}
.sw.mezz{border-color:var(--pose);border-style:dashed}.sw.jaune{border:0;border-top:2px dashed #E0B400;height:0;width:18px;vertical-align:3px}
.cles{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:auto}
.cle{border:1px solid var(--line);border-left:4px solid var(--at);border-radius:4px;padding:5px 8px;font-size:8.5pt;display:flex;flex-direction:column;gap:2px}
.cle b{font:700 13pt "IBM Plex Mono",ui-monospace,Menlo,monospace;color:#8a3f05}
.aside{flex:1;display:flex;flex-direction:column;gap:6px;font-size:9.5pt}
.aside h3{font:700 12pt "Barlow Semi Condensed",Arial,sans-serif;margin:6px 0 0;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.aside .big{margin:0;font:700 26pt "IBM Plex Mono",ui-monospace,monospace;color:#8a3f05}
table.dec{border-collapse:collapse}table.dec td{padding:3px 6px;border-bottom:1px solid var(--line);vertical-align:top}table.dec td:first-child{font:700 12pt "IBM Plex Mono",monospace;color:#8a3f05;white-space:nowrap}
.note{font-size:8.5pt;color:var(--muted);margin:2px 0}.note.c{text-align:center}
ul{list-style:none;margin:0;padding:0}
li{padding:1px 0;border-bottom:.5px solid #e3e6e8;break-inside:avoid}
li:last-child{border-bottom:0}
b.ref{font:600 8.6pt "IBM Plex Mono",ui-monospace,Menlo,monospace;color:var(--ink)}
.clr{color:var(--muted)}.clr::before{content:"· "}
.lg{font:600 8.4pt "IBM Plex Mono",monospace;color:#8a3f05;white-space:nowrap}.lg::before{content:"· "}
.vide{color:var(--hors);font-style:italic;margin:0;font-size:8.5pt}
.tag{display:inline-block;background:var(--at);color:#fff;font:700 10.5pt "Barlow Semi Condensed",Arial,sans-serif;padding:1px 7px;border-radius:3px;letter-spacing:.02em}
.bande{display:flex;align-items:center;gap:8px;margin:2px 0}
.fl{font-size:8pt;color:var(--muted);white-space:nowrap}
.dmur{flex:1;display:grid;grid-template-columns:repeat(25,1fr);gap:2px}
.dcase{border:1.3px solid var(--at);background:var(--at-l);border-radius:2px;text-align:center;padding:4px 0 2px;display:flex;flex-direction:column;line-height:1}
.dcase b{font:700 13pt "Barlow Semi Condensed",Arial,sans-serif;color:#8a3f05}.dcase small{font-size:6.5pt;color:var(--muted)}
.dcase.vide{background:#fff;border-style:dashed}
.cols3{columns:3;column-gap:6mm;font-size:8.4pt;margin-top:6px}
.cols2{columns:2;column-gap:8mm;font-size:8.6pt}
.bloc{break-inside:avoid;margin:0 0 6px}
.bloc h4{margin:0 0 2px;font:600 10pt "Barlow",Arial,sans-serif;border-bottom:1.5px solid var(--at);padding-bottom:2px}
.racks{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;flex:1;min-height:0}
.racks.deux{grid-template-columns:1fr 1.3fr}
.rack{display:flex;flex-direction:column;border:1.5px solid var(--ink);border-radius:4px;padding:4px 6px;font-size:8.3pt;min-height:0}
.rack h4{margin:0 0 3px;font:600 9.5pt "Barlow",Arial,sans-serif}
.niv{flex:1;display:flex;gap:6px;border-top:1px solid var(--line);padding:2px 0;min-height:0;overflow:hidden}
.niv .nl{font:700 9pt "IBM Plex Mono",monospace;color:#8a3f05;min-width:30px}
.niv>div{flex:1}
.bas{margin-top:5mm}
.grille{flex:1 0 auto;min-height:165mm;display:grid;grid-template-rows:min-content repeat(6,auto);gap:0;border:2px solid var(--ink);min-height:0;font-size:8.2pt}
.gh{font:700 11pt "Barlow Semi Condensed",Arial,sans-serif;text-align:center;padding:3px;background:var(--ink);color:#fff;border-left:1px solid #555}
.gn{font:700 11pt "IBM Plex Mono",monospace;color:#8a3f05;display:flex;align-items:center;justify-content:center;border-top:1px solid var(--ink);background:var(--at-l)}
.gc{border-left:1px solid var(--line);border-top:1px solid var(--ink);padding:2px 4px 3px;overflow:hidden;min-height:0;position:relative}
.gc .cc{display:block;font:600 7pt "IBM Plex Mono",monospace;color:var(--at);margin-bottom:1px}
.gc.vide::after{content:"vide / à relever";display:block;color:var(--hors);font-style:italic;font-size:7.5pt}
.gc li{line-height:1.2;padding:0;border:0}
.gc b.ref{font-size:8pt}
.dense{margin:0;font-size:7.6pt;line-height:1.3}.dense b{font:600 7.6pt "IBM Plex Mono",monospace}
.index{columns:4;column-gap:5mm;font-size:7.8pt}
.index li{display:flex;flex-wrap:wrap;gap:0 4px;padding:1px 0}
.index b.ref{font-size:8pt}.index .nm{color:var(--muted);flex:1 1 auto}.index .em{font:600 7.8pt "IBM Plex Mono",monospace;color:#8a3f05;margin-left:auto;text-align:right}
"""

HTML = f'''<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Plan du stock atelier à imprimer</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@600;700&family=Barlow:wght@400;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap">
<!-- Généré par outil/plan_atelier_imprimable.py à partir de plan-stock.html : ne pas modifier à la main. -->
<style>{CSS}</style>
</head>
<body>
<div class="barre"><a href="plan-stock.html">← Plan 3D</a><h1>Plan du stock atelier · {len(FEUILLES)} feuilles à imprimer</h1><button onclick="print()">🖨 Imprimer</button>
<p>A4 paysage. Feuille 1 : plan de l'atelier · 2 : mezzanine · 3 : barres debout · 4 : racks · puis une feuille par face d'étagère de la mezzanine (à afficher au bout des rangées) · armoires · index des références.</p></div>
{"".join(FEUILLES)}
</body>
</html>
'''

OUT.write_text(HTML, encoding="utf-8")
print(f"{OUT.name} écrit : {len(FEUILLES)} feuilles, état au {DATE}")
