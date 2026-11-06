#!/usr/bin/env python3
"""Relevé des photos de consommables (sorties / retours au stock) par Claude.

  python3 -I outil/releve_conso.py liste <dossier>        télécharge les photos pas encore relues et affiche leur liste
  python3 -I outil/releve_conso.py ecrit <id> '<json>'    enregistre le relevé d'une photo et la marque comme relue
  python3 -I outil/releve_conso.py articles [atelier]     liste les articles du stock pose (ou atelier : réf., longueur, emplacement)

Le relevé est un JSON : {"articles":[{"a":"Silicone","fiche":"Silicone","c":"blanc","q":4,"u":"cartouche"}],"txt":"remarque"}
- a : article (nom courant) ; fiche : intitulé exact de la ligne dans la fiche de préparation, si on le connaît ;
- c : coloris (silicone, mastic, habillage) ; q : quantité ; u : unité (cartouche, bombe, rouleau, boîte, ml…).
- stock : id de l'article du stock pose (commande « articles ») ; qs : quantité dans l'unité du stock si elle diffère
  (ex. 6 cartouches d'un article compté en cartons de 12 → qs 0,5). Sans qs, la conversion utilise la contenance de l'article.
  Avec « stock », le relevé enlève (sortie) ou remet (retour) la quantité dans le stock ; relire une photo remplace ses mouvements.
Atelier (photos « atl_entree » = barres en trop / chutes qui entrent en stock, « atl_sortie » = chute reprise) : sans chantier,
hors déboursé des chantiers (les chutes viennent souvent de plusieurs chantiers) ;
- même JSON, avec l : longueur en m ; stock : id de l'article atelier (commande « articles atelier », même réf. + coloris + longueur) ;
  ou, pour une chute ou une barre absente du stock, nouveau : {"ref","nom","coloris","longueur","emplacement"} (créée en famille « Chutes »,
  ou « Barres » si "barre": true). q = nombre de barres / chutes.
  Manu colle sur chaque barre / chute une étiquette « réf. · couleur · longueur · emplacement » et photographie l'étiquette
  ou sa feuille récapitulative (plusieurs lignes) : l'emplacement de l'étiquette fait foi (même réf. + couleur + longueur
  rangée ailleurs = autre ligne de stock).
Ne noter que ce qui se voit ou se compte sans doute possible ; sinon le dire dans « txt ».
L'appli reprend ces relevés : fenêtre Consommables de la fiche (bouton « Reporter dans la fiche ») et onglet Stock.
Accès : l'hôte Supabase est authentifié par le proxy de l'environnement « MGDS Supabase ».
"""
import json, os, sys, urllib.parse, urllib.request

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x"}


def req(method, path, body=None, extra=None, raw=False):
    r = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={**H, "Content-Type": "application/json", **(extra or {})})
    with urllib.request.urlopen(r) as x:
        t = x.read()
        return t if raw else (json.loads(t) if t else None)


def liste(dossier):
    os.makedirs(dossier, exist_ok=True)
    rows = req("GET", "/rest/v1/photos?select=id,chantier,categorie,chemin,note,pris_le,poseur"
                      "&categorie=in.(conso_sortie,conso_retour,atl_entree,atl_sortie)&traite=eq.false&order=pris_le")
    noms = {p["id"]: p.get("nom") or p["email"] for p in req("GET", "/rest/v1/profils?select=id,nom,email")}
    for p in rows:
        f = os.path.join(dossier, f"{p['id']}.jpg")
        with open(f, "wb") as o:
            o.write(req("GET", "/storage/v1/object/photos/" + urllib.parse.quote(p["chemin"]), raw=True))
        p["fichier"], p["par"] = f, noms.get(p["poseur"], "?")
        print(json.dumps({k: p[k] for k in ("id", "chantier", "categorie", "pris_le", "par", "note", "fichier")}, ensure_ascii=False))
    print(f"{len(rows)} photo(s) à relire")


def articles(stock="pose"):
    champs = "id,ref,nom,coloris,famille,unite,longueur,emplacement" if stock == "atelier" else "id,nom,coloris,famille,unite,detail,contenance"
    i = 0
    while True:  # la base ne rend que 1 000 lignes par requête
        page = req("GET", f"/rest/v1/stock_articles?select={champs}&stock=eq.{stock}&actif=eq.true&order=id&offset={i}&limit=1000")
        for a in page:
            print(json.dumps(a, ensure_ascii=False))
        if len(page) < 1000:
            break
        i += 1000


def stock(pid, o):
    """Reporte le relevé dans le stock pose (sortie ou retour), en remplaçant ce qui venait déjà de cette photo."""
    try:
        p = req("GET", f"/rest/v1/photos?select=id,chantier,categorie,pris_le,poseur&id=eq.{int(pid)}")[0]
        req("DELETE", f"/rest/v1/stock_mouvements?photo=eq.{int(pid)}", extra={"Prefer": "return=minimal"})
    except Exception as e:  # tables du stock pas encore installées
        print("stock non mis à jour :", e)
        return
    atl = p["categorie"].startswith("atl_")
    mv = []
    for x in o["articles"]:
        if atl and not x.get("stock") and x.get("nouveau"):  # chute ou barre pas encore au stock : on la crée
            n = x["nouveau"]
            ref = n.get("ref") or None
            nom = n.get("nom") or ""
            if not n.get("barre") and not nom.lower().startswith("chute"):
                nom = ("Chute " + nom).strip() if nom else (f"Chute {ref}" if ref else "Chute")
            a = req("POST", "/rest/v1/stock_articles", {
                "stock": "atelier", "famille": "Barres" if n.get("barre") else "Chutes", "unite": "barre",
                "ref": ref, "nom": nom or (f"Barre {ref}" if ref else "Barre"), "coloris": n.get("coloris"),
                "longueur": n.get("longueur") or x.get("l"), "emplacement": n.get("emplacement"),
                "fournisseur": "Technal" if (ref or "").startswith("T") else None}, {"Prefer": "return=representation"})[0]
            x["stock"] = a["id"]
        a = req("GET", f"/rest/v1/stock_articles?select=id,unite,detail,contenance&id=eq.{int(x['stock'])}")[0] if x.get("stock") else None
        if not a:
            continue
        q = float(str(x.get("qs", x.get("q", 0))).replace(",", "."))
        if not atl and "qs" not in x and a.get("contenance") and (x.get("u") or "").lower().rstrip("s") != (a["unite"] or "").lower().rstrip("s"):
            q = q / float(a["contenance"])
        if q > 0:
            mv.append({"article": a["id"], "type": "sortie" if p["categorie"] in ("conso_sortie", "atl_sortie") else "retour", "qte": round(q, 3),
                       "chantier": p["chantier"], "photo": p["id"], "le": p["pris_le"], "par": p["poseur"], "note": "Photo relue par Claude"})
    if mv:
        req("POST", "/rest/v1/stock_mouvements", mv, {"Prefer": "return=minimal"})
    print(f"{len(mv)} mouvement(s) de stock pour la photo {pid}")


def ecrit(pid, releve):
    o = json.loads(releve)
    assert isinstance(o.get("articles"), list), "il faut une liste « articles »"
    stock(pid, o)  # d'abord : une chute créée y reçoit son id, gardé dans le relevé (relire la photo ne la recrée pas)
    req("PATCH", f"/rest/v1/photos?id=eq.{int(pid)}", {"releve": json.dumps(o, ensure_ascii=False), "traite": True},
        {"Prefer": "return=minimal"})
    print("relevé enregistré pour la photo", pid)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["liste"]:
        liste(a[1] if len(a) > 1 else "photos-conso")
    elif a[:1] == ["articles"]:
        articles(a[1] if len(a) > 1 else "pose")
    elif a[:1] == ["ecrit"] and len(a) == 3:
        ecrit(a[1], a[2])
    else:
        print(__doc__)
