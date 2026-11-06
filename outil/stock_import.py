#!/usr/bin/env python3
"""Import d'un inventaire Excel dans le stock de l'appli (tables stock_articles / stock_mouvements, voir stock.sql).

  python3 -I outil/stock_import.py voir <inventaire.xlsx>                 affiche ce qui serait importé
  python3 -I outil/stock_import.py envoie <inventaire.xlsx> <AAAA-MM-JJ>  crée les articles absents et enregistre
                                                                         la quantité comptée ce jour-là (inventaire)

Fichier « Inventaire Stock valorisé » (serveur MGDS > CLIENTS) : feuilles « Pose - … » (stock pose), « Atelier - … »,
« Joints - … », « Accessoires - … », « Profilés - … » (stock atelier ; barres comptées à la barre, avec leur localisation
D 1, D 2… en emplacement). Un ancien fichier à une seule feuille est lu comme l'inventaire pose.
Un article déjà présent (même stock, réf., nom, coloris, longueur, emplacement) n'est pas recréé : seul son comptage est ajouté.
Accès : l'hôte Supabase est authentifié par le proxy de l'environnement « MGDS Supabase ».
"""
import json, re, sys, urllib.request
import openpyxl

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x", "Content-Type": "application/json"}

FAMILLES = [
    ("Silicones et mastics", r"silicone|acrylique|colle|mastic|graisse silicone"),
    ("Mousses PU", r"mousse|gun&foam"),
    ("Étanchéité (compribande, membranes)", r"compribande|membrane|joint de dilatation|isolant|epdm"),
    ("Vis", r"\bvis|autoforeuse|top ?roc|sptr|techpro t[eê]te|betofix|vissaplac|boulon"),
    ("Chevilles et ancrages", r"cheville|goujon|ancrage|molly|rivet"),
    ("Forets, disques, lames, embouts", r"for[eê]t|disque|lame|embout|scie|ciseau"),
    ("Cales", r"\bcale"),
    ("Protection et sécurité", r"surchaussure|casque|harnais|syam|corde|gants?|masque|cartouches plomb|bache|b[aâ]che|moquette|papier|balisage|pluie"),
    ("Entretien et nettoyage", r"cr[eè]me|alcool|vitres|sacs? poubelle|\bt10\b|\bt20\b|wd40|nettoyant|huile|aspirateur|filtre"),
    ("Électricité", r"interrupteur|d[ée]rivation"),
    ("Quincaillerie", r"cylindre|ventouse"),
    ("Adhésifs", r"scotch|adh[ée]sif"),
]
COLORIS = ["gris alu", "gris clair", "ton pierre", "bronze", "translucide", "noir", "blanc", "gris", "zingué",
           "orange", "RAL 9005", "RAL 9016"]


def famille(nom):
    n = nom.lower()
    for f, rx in FAMILLES:
        if re.search(rx, n):
            return f
    return "Divers"


def coloris(nom):
    n = nom.lower()
    for c in COLORIS:
        if c.lower() in n:
            return c
    return None


def nombre(v):
    if v is None or v == "":
        return 0.0
    try:
        return float(str(v).replace(",", "."))
    except ValueError:
        return 0.0


def txt(v):
    return str(v).strip() if v not in (None, "") else ""


def place(v):
    """« D21 » / « D 21 » → « D 21 » ; vide ou 0 → None."""
    t = txt(v).upper()
    if t in ("", "0", "NONE"):
        return None
    m = re.fullmatch(r"([A-Z]+)\s*(\d+)", t)
    return f"{m.group(1)} {m.group(2)}" if m else t


def feuille_pose(ws):
    out = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        r = tuple(r) + (None,) * 10  # colonnes PU absentes (export fait par un non-éditeur)
        nom = txt(r[0])
        if not nom or nom.upper().startswith("TOTAL"):
            continue
        fmt = txt(r[2]) or "unité"
        if re.fullmatch(r"\d+", fmt):  # « 500 » = boîte de 500
            fmt = f"Boîte de {fmt}"
        four = txt(r[3])
        out.append({"stock": "pose", "nom": nom, "famille": famille(nom), "coloris": coloris(nom), "unite": fmt,
                    "fournisseur": None if four in ("", "?") else four, "pu": nombre(r[4]) or None, "qte": nombre(r[1])})
    return out


def feuille_atelier(ws, fam, cols):
    """cols : index (ref, nom, qte, unite, fournisseur ou None, pu)."""
    out = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        r = tuple(r) + (None,) * 10  # colonnes PU absentes (export fait par un non-éditeur)
        ref, nom = txt(r[cols[0]]), txt(r[cols[1]])
        if (not nom and not ref) or nom.upper().startswith("TOTAL") or ref.upper().startswith("TOTAL"):
            continue
        four = txt(r[cols[4]]) if cols[4] is not None else ("Technal" if ref.startswith("T") else "")
        out.append({"stock": "atelier", "ref": ref or None, "nom": nom or f"Article {ref}", "famille": fam,
                    "coloris": coloris(nom), "unite": txt(r[cols[3]]) or "unité", "fournisseur": four.title() if four.isupper() else (four or None),
                    "pu": nombre(r[cols[5]]) or None, "qte": nombre(r[cols[2]])})
    return out


def feuille_profils(ws):
    """Une ligne par référence + coloris + longueur + emplacement ; quantité = nombre de barres."""
    lignes = {}
    for r in ws.iter_rows(min_row=2, values_only=True):
        r = tuple(r) + (None,) * 10  # colonnes PU absentes (export fait par un non-éditeur)
        ref, nom = txt(r[0]), txt(r[1])
        if (not nom and not ref) or ref.upper().startswith("TOTAL"):
            continue
        col = " ".join(x for x in (txt(r[2]), txt(r[3]).lower()) if x) or None
        if col and re.fullmatch(r"\d{4}( .*)?", col):
            col = "RAL " + col
        lg, nbar, ml = nombre(r[5]), nombre(r[4]), nombre(r[7])
        tole = nom.lower().startswith("tôle") or nom.lower().startswith("tole")
        if tole:
            q, unite = (nbar or ml), "tôle"
        elif lg:
            q, unite = (ml / lg if ml else 0), "barre"
        else:
            q, unite = ml, "m"
        k = (ref, nom.lower(), col, lg if not tole else None, place(r[6]))
        if k not in lignes:
            lignes[k] = {"stock": "atelier", "ref": ref or None, "nom": (nom[0].upper() + nom[1:]) if nom else f"Profilé {ref}",
                         "famille": "Tôles" if tole else "Chutes" if nom.lower().startswith("chute") else "Barres", "coloris": col, "unite": unite,
                         "longueur": lg if (lg and not tole) else None, "emplacement": place(r[6]),
                         "fournisseur": "Technal" if ref.startswith("T") else None, "pu": nombre(r[8]) or None, "qte": 0.0}
        lignes[k]["qte"] += q
    return list(lignes.values())


def lire(xlsx):
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    noms = {re.sub(r"\s+", " ", n.strip().lower()): n for n in wb.sheetnames}
    trouve = lambda debut: next((wb[v] for k, v in noms.items() if k.startswith(debut)), None)
    if not trouve("pose -"):  # ancien fichier à une seule feuille (inventaire pose)
        return feuille_pose(wb.active)
    out = feuille_pose(trouve("pose -"))
    if trouve("atelier -"):
        out += feuille_atelier(trouve("atelier -"), "Consommables atelier", (0, 1, 2, 3, 4, 5))
    if trouve("joints -"):
        out += feuille_atelier(trouve("joints -"), "Joints", (0, 1, 2, 3, None, 4))
    if trouve("accessoires -"):
        out += feuille_atelier(trouve("accessoires -"), "Accessoires", (0, 1, 2, 3, None, 4))
    if trouve("profilés -") or trouve("profiles -"):
        out += feuille_profils(trouve("profilés -") or trouve("profiles -"))
    return out


def cle(a):
    return (a.get("stock", "pose"), a.get("ref") or "", a["nom"], a.get("coloris") or "", a.get("longueur") or 0, a.get("emplacement") or "")


def req(method, path, body=None, extra=None):
    r = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={**H, **(extra or {})})
    with urllib.request.urlopen(r) as x:
        t = x.read()
        return json.loads(t) if t else None


CHAMPS = ("stock", "ref", "nom", "famille", "coloris", "unite", "longueur", "emplacement", "fournisseur", "pu")


def envoie(xlsx, jour):
    lignes = lire(xlsx)
    tous, i = [], 0
    while True:  # la base ne rend que 1 000 lignes par requête
        page = req("GET", f"/rest/v1/stock_articles?select=id,{','.join(CHAMPS)}&order=id&offset={i}&limit=1000")
        tous += page
        if len(page) < 1000:
            break
        i += 1000
    existants = {cle(a): a["id"] for a in tous}
    neufs, vus = [], set()
    for l in lignes:
        if cle(l) in existants or cle(l) in vus:
            continue
        vus.add(cle(l))
        neufs.append({k: l.get(k) for k in CHAMPS})
    for i in range(0, len(neufs), 500):
        for a in req("POST", "/rest/v1/stock_articles", neufs[i:i + 500], {"Prefer": "return=representation"}):
            existants[cle(a)] = a["id"]
    qte = {}
    for l in lignes:  # lignes identiques : quantités additionnées
        qte[existants[cle(l)]] = qte.get(existants[cle(l)], 0) + l["qte"]
    mvts = [{"article": i, "type": "inventaire", "qte": round(q, 3), "le": f"{jour}T18:00:00+02:00",
             "note": f"Inventaire du {jour[8:10]}/{jour[5:7]}/{jour[:4]}"} for i, q in qte.items()]
    for i in range(0, len(mvts), 500):
        req("POST", "/rest/v1/stock_mouvements", mvts[i:i + 500], {"Prefer": "return=minimal"})
    print(f"{len(neufs)} article(s) créé(s), {len(mvts)} comptage(s) enregistré(s)")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["voir"] and len(a) == 2:
        for l in lire(a[1]):
            print(json.dumps(l, ensure_ascii=False))
    elif a[:1] == ["envoie"] and len(a) == 3:
        envoie(a[1], a[2])
    else:
        print(__doc__)
