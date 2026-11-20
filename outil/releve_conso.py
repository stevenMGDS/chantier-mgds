#!/usr/bin/env python3
"""Relevé des photos de consommables (sorties / retours au stock) par Claude.

  python3 -I outil/releve_conso.py liste <dossier>        télécharge les photos pas encore relues et affiche leur liste
  python3 -I outil/releve_conso.py ecrit <id> '<json>'    enregistre le relevé d'une photo et la marque comme relue
  python3 -I outil/releve_conso.py articles [atelier]     liste les articles du stock pose (ou atelier : réf., longueur, emplacement)
  python3 -I outil/releve_conso.py question '<json>'      pose une question dans l'appli (bandeau « Questions de Claude » du Stock)
  python3 -I outil/releve_conso.py questions              questions répondues à traiter (et nombre de questions encore ouvertes)
  python3 -I outil/releve_conso.py applique <n°> ['<json>']  fait les mouvements du choix retenu (ou du JSON donné), puis clôt
  python3 -I outil/releve_conso.py classe <n°> '<texte>'  clôt une question sans mouvement de stock (ex. réponse « Non »)

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
Entrée en stock (photos « conso_entree », 20/11/2026) : livraison reçue au dépôt (colis, bon de livraison), chantier facultatif ;
  même JSON, mouvement « livraison » ; pour un article absent du stock pose : nouveau {"nom","famille","coloris","unite","fournisseur"}.
Commande passée (photos « commande ») : bon de commande, panier ou devis fournisseur ; aucun mouvement de stock, le relevé
  (articles + txt : fournisseur, n° de commande, date de livraison annoncée) reste lisible dans l'appli.
Ne noter que ce qui se voit ou se compte sans doute possible ; sinon le dire dans « txt ».
Questions (outil/questions-claude.sql, Steven 18/11/2026) : pour une ligne douteuse, enregistrer d'abord ce qui est sûr, puis
  question '{"photo":28,"pour":"atelier","question":"…","detail":"…","choix":[{"t":"Oui","type":"entree","articles":[…]},{"t":"Non"}]}'
  - pour : atelier (Christophe, Manu), pose (poseurs) ou bureau ; libre (défaut true) : réponse « Autre » en texte permise ;
  - chaque choix : t = texte du bouton ; articles = lignes au format du relevé (stock / nouveau / q / l…) à passer si ce choix
    est retenu ; type = entree ou sortie (défaut : celui de la photo). Un choix sans articles = rien à faire au stock.
  Seul celui qui répond décide : une question sans réponse ne déclenche rien. Au passage suivant : « questions », puis
  « applique <n°> » pour un choix avec articles, « applique <n°> '<json articles>' » pour une réponse libre comprise sans
  doute possible, ou « classe <n°> '<texte>' » ; si la réponse libre reste floue, la laisser et le dire à Steven.
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
                      "&categorie=in.(conso_sortie,conso_retour,conso_entree,commande,atl_entree,atl_sortie)&traite=eq.false&order=pris_le")
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


NOTE_RELEVE = "Photo relue par Claude"


def stock(pid, o):
    """Reporte le relevé dans le stock pose (sortie ou retour), en remplaçant ce qui venait déjà de ce relevé
    (les mouvements faits d'après une réponse à une question restent)."""
    try:
        p = req("GET", f"/rest/v1/photos?select=id,chantier,categorie,pris_le,poseur&id=eq.{int(pid)}")[0]
        req("DELETE", f"/rest/v1/stock_mouvements?photo=eq.{int(pid)}&note=eq.{urllib.parse.quote(NOTE_RELEVE)}",
            extra={"Prefer": "return=minimal"})
    except Exception as e:  # tables du stock pas encore installées
        print("stock non mis à jour :", e)
        return
    n = mouvements(p, o["articles"])
    print(f"{n} mouvement(s) de stock pour la photo {pid}")


def mouvements(p, articles, sens=None, note=NOTE_RELEVE, le=None, par=None):
    """Crée les mouvements de stock d'une liste d'articles (format du relevé). sens : "sortie" / "entree" pour forcer
    le sens (sinon celui de la catégorie de la photo)."""
    atl = p["categorie"].startswith("atl_")
    if p["categorie"] == "commande" and not sens:  # une commande passée ne touche pas le stock
        return 0
    entree = p["categorie"] == "conso_entree"
    sortie = (sens == "sortie") if sens else p["categorie"] in ("conso_sortie", "atl_sortie")
    mv = []
    for x in articles:
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
        if entree and not x.get("stock") and x.get("nouveau"):  # consommable livré, pas encore au stock pose : on le crée
            n = x["nouveau"]
            a = req("POST", "/rest/v1/stock_articles", {
                "stock": "pose", "famille": n.get("famille") or "Divers", "unite": n.get("unite") or x.get("u") or "unité",
                "nom": n.get("nom") or x.get("a") or "Article", "coloris": n.get("coloris") or x.get("c"),
                "fournisseur": n.get("fournisseur")}, {"Prefer": "return=representation"})[0]
            x["stock"] = a["id"]
        a = req("GET", f"/rest/v1/stock_articles?select=id,unite,detail,contenance&id=eq.{int(x['stock'])}")[0] if x.get("stock") else None
        if not a:
            continue
        q = float(str(x.get("qs", x.get("q", 0))).replace(",", "."))
        if not atl and "qs" not in x and a.get("contenance") and (x.get("u") or "").lower().rstrip("s") != (a["unite"] or "").lower().rstrip("s"):
            q = q / float(a["contenance"])
        if q > 0:
            mv.append({"article": a["id"], "type": "sortie" if sortie else ("livraison" if entree else "retour"), "qte": round(q, 3),
                       "chantier": p["chantier"], "photo": p["id"], "le": le or p["pris_le"], "par": par or p["poseur"], "note": note})
    if mv:
        req("POST", "/rest/v1/stock_mouvements", mv, {"Prefer": "return=minimal"})
    return len(mv)


def ecrit(pid, releve):
    o = json.loads(releve)
    assert isinstance(o.get("articles"), list), "il faut une liste « articles »"
    stock(pid, o)  # d'abord : une chute créée y reçoit son id, gardé dans le relevé (relire la photo ne la recrée pas)
    req("PATCH", f"/rest/v1/photos?id=eq.{int(pid)}", {"releve": json.dumps(o, ensure_ascii=False), "traite": True},
        {"Prefer": "return=minimal"})
    print("relevé enregistré pour la photo", pid)


QCHAMPS = "id,cree_le,pour,photo,chantier,question,detail,choix,libre,statut,reponse,reponse_txt,repondu_par,repondu_le,suite"


def question(texte):
    o = json.loads(texte)
    assert o.get("question"), "il faut le texte de la question"
    choix = o.get("choix") or []
    assert isinstance(choix, list) and all(isinstance(c, dict) and c.get("t") for c in choix), "choix = liste de {\"t\": …}"
    assert choix or o.get("libre", True), "il faut des choix ou une réponse libre"
    for c in choix:
        assert c.get("type", "entree") in ("entree", "sortie"), "type = entree ou sortie"
        assert isinstance(c.get("articles", []), list), "articles = liste"
    ch = o.get("chantier")
    if o.get("photo") and not ch:
        ph = req("GET", f"/rest/v1/photos?select=chantier&id=eq.{int(o['photo'])}")
        ch = ph[0]["chantier"] if ph else None
    q = req("POST", "/rest/v1/questions_claude", {
        "pour": o.get("pour", "atelier"), "photo": o.get("photo"), "chantier": ch, "question": o["question"],
        "detail": o.get("detail"), "choix": choix, "libre": o.get("libre", True)}, {"Prefer": "return=representation"})[0]
    print("question n°", q["id"], "posée")


def questions():
    noms = {p["id"]: p.get("nom") or p["email"] for p in req("GET", "/rest/v1/profils?select=id,nom,email")}
    R = req("GET", f"/rest/v1/questions_claude?select={QCHAMPS}&statut=eq.repondue&order=id")
    for q in R:
        c = q["choix"][q["reponse"]] if q["reponse"] is not None and 0 <= q["reponse"] < len(q["choix"]) else None
        print(json.dumps({"id": q["id"], "photo": q["photo"], "question": q["question"], "detail": q["detail"],
                          "reponse": c["t"] if c else "Autre", "texte": q["reponse_txt"],
                          "a_des_articles": bool(c and c.get("articles")), "par": noms.get(q["repondu_par"], "?"),
                          "le": q["repondu_le"]}, ensure_ascii=False))
    ouv = req("GET", "/rest/v1/questions_claude?select=id&statut=eq.ouverte")
    print(f"{len(R)} réponse(s) à traiter, {len(ouv)} question(s) sans réponse")


def _clos(qid, suite):
    import datetime
    req("PATCH", f"/rest/v1/questions_claude?id=eq.{int(qid)}&statut=eq.repondue",
        {"statut": "appliquee", "suite": suite, "applique_le": datetime.datetime.now(datetime.timezone.utc).isoformat()},
        {"Prefer": "return=minimal"})


def applique(qid, texte=None):
    q = req("GET", f"/rest/v1/questions_claude?select={QCHAMPS}&id=eq.{int(qid)}")
    assert q, "question introuvable"
    q = q[0]
    assert q["statut"] == "repondue", f"question {qid} : statut {q['statut']} (seule une question répondue s'applique)"
    c = q["choix"][q["reponse"]] if q["reponse"] is not None and 0 <= q["reponse"] < len(q["choix"]) else {}
    if texte:
        o = json.loads(texte)
        arts, sens = (o, None) if isinstance(o, list) else (o.get("articles", []), o.get("type"))
    else:
        assert c.get("articles"), "ce choix n'a pas d'articles : utiliser « classe », ou donner le JSON des articles"
        arts, sens = c["articles"], c.get("type")
    assert q["photo"], "question sans photo : mouvements à faire à la main"
    p = req("GET", f"/rest/v1/photos?select=id,chantier,categorie,pris_le,poseur&id=eq.{int(q['photo'])}")[0]
    noms = {x["id"]: x.get("nom") or x["email"] for x in req("GET", "/rest/v1/profils?select=id,nom,email")}
    qui = noms.get(q["repondu_par"], "?")
    n = mouvements(p, arts, "sortie" if sens == "sortie" else ("entree" if sens == "entree" else None),
                   note=f"Réponse de {qui} à la question n° {q['id']}", le=q["repondu_le"], par=q["repondu_par"])
    _clos(qid, f"{n} mouvement(s) de stock d'après la réponse « {c.get('t') or q['reponse_txt']} »")
    print(f"question {qid} : {n} mouvement(s) de stock, close")


def classe(qid, suite):
    q = req("GET", f"/rest/v1/questions_claude?select=statut&id=eq.{int(qid)}")
    assert q and q[0]["statut"] == "repondue", "seule une question répondue se clôt"
    _clos(qid, suite)
    print(f"question {qid} close sans mouvement")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["liste"]:
        liste(a[1] if len(a) > 1 else "photos-conso")
    elif a[:1] == ["articles"]:
        articles(a[1] if len(a) > 1 else "pose")
    elif a[:1] == ["ecrit"] and len(a) == 3:
        ecrit(a[1], a[2])
    elif a[:1] == ["question"] and len(a) == 2:
        question(a[1])
    elif a[:1] == ["questions"]:
        questions()
    elif a[:1] == ["applique"] and len(a) in (2, 3):
        applique(a[1], a[2] if len(a) == 3 else None)
    elif a[:1] == ["classe"] and len(a) == 3:
        classe(a[1], a[2])
    else:
        print(__doc__)
