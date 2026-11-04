#!/usr/bin/env python3
"""Import d'un inventaire Excel dans le stock de l'appli (tables stock_articles / stock_mouvements, voir stock.sql).

  python3 -I outil/stock_import.py voir <inventaire.xlsx>                 affiche ce qui serait importé
  python3 -I outil/stock_import.py envoie <inventaire.xlsx> <AAAA-MM-JJ>  crée les articles absents et enregistre
                                                                         la quantité comptée ce jour-là (inventaire)

Colonnes attendues (ligne 1) : DÉSIGNATION, QTÉ, FORMAT, Fournisseur, P.U. H.T. (le reste est ignoré).
Un article déjà présent (même nom) n'est pas recréé : seul son comptage est ajouté.
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


def lire(xlsx):
    ws = openpyxl.load_workbook(xlsx, data_only=True).active
    out = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        nom = str(r[0] or "").strip()
        if not nom or nom.upper().startswith("TOTAL"):
            continue
        fmt = str(r[2]).strip() if r[2] not in (None, "") else "unité"
        if re.fullmatch(r"\d+", fmt):  # « 500 » = boîte de 500
            fmt = f"Boîte de {fmt}"
        four = str(r[3] or "").strip()
        out.append({"nom": nom, "famille": famille(nom), "coloris": coloris(nom), "unite": fmt,
                    "fournisseur": None if four in ("", "?") else four,
                    "pu": nombre(r[4]) or None, "qte": nombre(r[1])})
    return out


def req(method, path, body=None, extra=None):
    r = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={**H, **(extra or {})})
    with urllib.request.urlopen(r) as x:
        t = x.read()
        return json.loads(t) if t else None


def envoie(xlsx, jour):
    lignes = lire(xlsx)
    existants = {a["nom"]: a["id"] for a in req("GET", "/rest/v1/stock_articles?select=id,nom")}
    neufs = [{k: l[k] for k in ("nom", "famille", "coloris", "unite", "fournisseur", "pu")} for l in lignes if l["nom"] not in existants]
    if neufs:
        for a in req("POST", "/rest/v1/stock_articles", neufs, {"Prefer": "return=representation"}):
            existants[a["nom"]] = a["id"]
    mvts = [{"article": existants[l["nom"]], "type": "inventaire", "qte": l["qte"], "le": f"{jour}T18:00:00+02:00",
             "note": f"Inventaire du {jour[8:10]}/{jour[5:7]}/{jour[:4]}"} for l in lignes]
    req("POST", "/rest/v1/stock_mouvements", mvts, {"Prefer": "return=minimal"})
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
