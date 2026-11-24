"""Captures du chiffrage déposées sur les devis en attente (Planning > Charge), lues par Claude.

  python3 -I chiffrage.py liste <dossier>     télécharge les captures pas encore lues dans <dossier> et les liste
  python3 -I chiffrage.py note <devis> <json> écrit ce que Claude a lu : {"client", "montant", "achats", "mo", "marge", "jp", "ha", "alerte"}
                                              (seules les clés données sont écrites ; lu = vrai ; le client seulement
                                              pour un devis créé depuis une capture, « Devis à lire (capture) »)
  python3 -I chiffrage.py report              devis signés rattachés à un chantier : achats prévus -> Direction (prev_)
  python3 -I chiffrage.py controle            devis en attente à compléter (jours, achats, mois, lieu, trajet à estimer)
  python3 -I chiffrage.py trajet <devis> <json> trajet estimé par Claude : {"km", "peage" (€ HT aller, classe 2), "h" (camion), "zone"}
  python3 -I chiffrage.py chantier <chantier> <doc_id> <json>
                                              capture déposée dans les documents d'un chantier (type « Chiffrage ») :
                                              achats, mo, marge -> direction/prev_<chantier> ; jp -> chantier.jp s'il est vide
Claude lit lui-même chaque image (tableau de marge du logiciel de devis) : prix de vente HT, total des achats, main-d'œuvre,
marge prévue ; jours de pose = main-d'œuvre de pose ÷ environ 1 000 € par jour d'équipe (900 à 1 000 €, règle de
Steven du 18/11/2026). « achats » = achat du tableau sans la ligne Pose (produits + divers) : pour un produit fabriqué
chez nous, il comprend la main-d'œuvre d'atelier de Christophe, que l'appli rajoute à la marge (heures d'atelier × 60 €). Un montant HT de la capture
différent de celui saisi sur la ligne est signalé dans « alerte », sans écraser la saisie.
Ligne Métré (Steven, 24/11/2026, simplifié) : si le tableau a une ligne main-d'œuvre « Métré » (ou « Maîtrise »), ajoute
son ACHAT à mo (jamais aux achats). Pour l'alerte des jours de pose, retire d'abord ce montant de mo avant de diviser
par 1 000 € : le métré n'est pas de la pose (il est déjà compté à part dans le temps total de l'appli).
"""
import json, os, sys, urllib.parse, urllib.request

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x"}  # l'hôte est authentifié par le proxy de l'environnement


def req(method, path, body=None, extra=None, raw=False):
    data = None if body is None else json.dumps(body).encode()
    h = {**H, **(extra or {})}
    if body is not None: h["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=h, method=method)) as r:
        b = r.read()
        return b if raw else (json.loads(b) if b else None)


def liste(dossier):
    os.makedirs(dossier, exist_ok=True)
    n = 0
    for r in req("GET", "/rest/v1/chantiers?select=id,data"):
        for doc in r["data"].get("docs") or []:
            if doc.get("type") != "Chiffrage" or doc.get("lu"): continue
            b = req("GET", "/storage/v1/object/documents/" + urllib.parse.quote(doc["id"]), raw=True)
            f = os.path.join(dossier, r["id"] + "__" + os.path.basename(doc["id"]))
            open(f, "wb").write(b)
            print(f"CHANTIER {r['id']} | {r['data'].get('client','')} | doc {doc['id']} | jours prévus {r['data'].get('jp','')} | {f}")
            n += 1
    for r in req("GET", "/rest/v1/devis?select=id,data"):
        d = r["data"]; c = d.get("chif")
        if not c or d.get("lu") or d.get("etat") not in (None, "attente", "signe"): continue
        b = req("GET", "/storage/v1/object/documents/" + urllib.parse.quote(c["path"]), raw=True)
        f = os.path.join(dossier, r["id"] + os.path.splitext(c["path"])[1])
        open(f, "wb").write(b)
        print(f"{r['id']} | {d.get('client','')} | montant saisi {d.get('montant','')} | pose {d.get('jp','')} j | atelier {d.get('ha','')} h | {f}")
        n += 1
    print(n, "capture(s) à lire")


def note(devis, valeurs):
    r = req("GET", "/rest/v1/devis?select=id,data&id=eq." + urllib.parse.quote(devis))
    if not r: sys.exit("devis introuvable : " + devis)
    d = r[0]["data"]
    ecarts = []   # saisie directe dans l'appli (23/11/2026) différente de la capture : la capture fait foi, l'écart est signalé
    for k, v in valeurs.items():
        if k == "montant" and d.get("montant") not in (None, "") and abs(float(d["montant"]) - float(v)) > 1:
            d["alerte"] = f"montant de la capture {v:,.0f} € différent de la ligne".replace(",", " ")
            continue
        if k == "client":
            if str(d.get("client", "")).startswith("Devis à lire") and v: d["client"] = v
            continue
        if k in ("achats", "mo") and d.get(k) not in (None, "") and v not in (None, "") and abs(float(d[k]) - float(v)) > max(20, 0.02 * float(v)):
            ecarts.append(f"{ {'achats': 'achats', 'mo': 'pose'}.get(k, 'métré') } saisis {float(d[k]):,.0f} €, capture {float(v):,.0f} €".replace(",", " "))
        if k in ("montant", "achats", "mo", "marge", "jp", "ha", "alerte") and v not in (None, ""):
            if k in ("jp", "ha") and d.get(k) not in (None, ""): continue   # ce que l'équipe a saisi reste
            d[k] = v
    if ecarts: d["alerte"] = "; ".join(x for x in [d.get("alerte"), "écart avec la saisie : " + ", ".join(ecarts)] if x)
    d["lu"] = True
    req("POST", "/rest/v1/devis", {"id": devis, "data": d}, {"Prefer": "resolution=merge-duplicates"})
    print(devis, "noté :", {k: d.get(k) for k in ("montant", "achats", "mo", "marge", "jp", "ha", "alerte")})


def controle():
    """Devis en attente à compléter (rappel de chaque passage, Steven 23/11/2026)."""
    n = 0
    for r in req("GET", "/rest/v1/devis?select=id,data"):
        d = r["data"]
        if (d.get("etat") or "attente") != "attente": continue
        dep, manque = d.get("dep") or {}, []
        if not d.get("jp"): manque.append("jours de pose sur place")
        if not d.get("achats") and not d.get("chif"): manque.append("achats (ou capture du chiffrage)")
        if not d.get("periode"): manque.append("mois de pose souhaité")
        if not dep.get("lieu"): manque.append("lieu du chantier (frais de déplacement)")
        elif dep.get("km") in (None, ""): manque.append("TRAJET À ESTIMER (km, péage, heures, zone) pour " + dep["lieu"])
        if "frais de déplacement" in (d.get("alerte") or "") and not dep.get("lieu"): manque.append("remise négative = déplacement : lieu à saisir")
        if manque:
            n += 1
            print(f"{r['id']} | {d.get('client','')} | à compléter : {', '.join(manque)}")
    print(n, "devis à compléter")


def trajet(devis, valeurs):
    """Trajet estimé par Claude quand l'appli n'a pas trouvé la commune : {"km", "peage", "h", "zone"}."""
    r = req("GET", "/rest/v1/devis?select=id,data&id=eq." + urllib.parse.quote(devis))
    if not r: sys.exit("devis introuvable : " + devis)
    d = r[0]["data"]
    dep = {**(d.get("dep") or {}), **{k: valeurs[k] for k in ("km", "peage", "h", "zone") if k in valeurs}, "src": "estimé"}
    d["dep"] = dep
    req("POST", "/rest/v1/devis", {"id": devis, "data": d}, {"Prefer": "resolution=merge-duplicates"})
    print(devis, "trajet noté :", dep)


def report():
    """Devis signé rattaché à un chantier (appli, 23/11/2026) : ses achats et sa main-d'œuvre prévus passent dans la
    Direction (prev_<chantier>) s'il n'y a encore rien. La capture du chantier, si elle arrive, les remplace."""
    have = {r["id"] for r in req("GET", "/rest/v1/direction?select=id&id=like.prev_*")}
    n = 0
    for r in req("GET", "/rest/v1/devis?select=id,data"):
        d = r["data"]
        if d.get("etat") != "signe" or not d.get("chantier") or d.get("achats") in (None, ""): continue
        if "prev_" + d["chantier"] in have: continue
        prev = {"kind": "prevu", "achat": d["achats"], "source": "devis en attente " + r["id"]}
        for k in ("mo", "marge"):
            if d.get(k) not in (None, ""): prev[k] = d[k]
        if d.get("montant") not in (None, ""): prev["vente_capture"] = d["montant"]
        req("POST", "/rest/v1/direction", {"id": "prev_" + d["chantier"], "data": prev}, {"Prefer": "resolution=merge-duplicates"})
        n += 1
        print("prévu reporté :", d["chantier"], d.get("client", ""))
    print(n, "chantier(s) reporté(s)")


def chantier(cid, doc_id, valeurs):
    r = req("GET", "/rest/v1/chantiers?select=id,data,version&id=eq." + urllib.parse.quote(cid))
    if not r: sys.exit("chantier introuvable : " + cid)
    row = r[0]; d = row["data"]
    prev = {"kind": "prevu", **{k: valeurs[k] for k in ("mo", "marge") if valeurs.get(k) not in (None, "")}}
    if valeurs.get("achats") not in (None, ""): prev["achat"] = valeurs["achats"]
    if valeurs.get("montant") not in (None, ""): prev["vente_capture"] = valeurs["montant"]
    req("POST", "/rest/v1/direction", {"id": "prev_" + cid, "data": prev}, {"Prefer": "resolution=merge-duplicates"})
    for doc in d.get("docs") or []:
        if doc.get("id") == doc_id: doc["lu"] = True
    if valeurs.get("jp") and not d.get("jp"): d["jp"] = valeurs["jp"]
    q = f"/rest/v1/chantiers?id=eq.{urllib.parse.quote(cid)}&version=eq.{row['version']}"
    req("PATCH", q, {"data": d}, {"Prefer": "return=minimal"})
    print(cid, "noté :", prev, "jp", d.get("jp"))


if __name__ == "__main__":
    if sys.argv[1] == "liste": liste(sys.argv[2])
    elif sys.argv[1] == "note": note(sys.argv[2], json.loads(sys.argv[3]))
    elif sys.argv[1] == "chantier": chantier(sys.argv[2], sys.argv[3], json.loads(sys.argv[4]))
    elif sys.argv[1] == "controle": controle()
    elif sys.argv[1] == "report": report()
    elif sys.argv[1] == "trajet": trajet(sys.argv[2], json.loads(sys.argv[3]))
