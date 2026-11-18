"""Captures du chiffrage déposées sur les devis en attente (Planning > Charge), lues par Claude.

  python3 -I chiffrage.py liste <dossier>     télécharge les captures pas encore lues dans <dossier> et les liste
  python3 -I chiffrage.py note <devis> <json> écrit ce que Claude a lu : {"montant", "achats", "mo", "marge", "jp", "ha", "alerte"}
                                              (seules les clés données sont écrites ; lu = vrai)
Claude lit lui-même chaque image (tableau de marge du logiciel de devis) : prix de vente HT, total des achats, main-d'œuvre,
marge prévue ; jours de pose = main-d'œuvre de pose ÷ 3 000 € (règle de chiffrage de Steven). Un montant HT de la capture
différent de celui saisi sur la ligne est signalé dans « alerte », sans écraser la saisie.
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
    for k, v in valeurs.items():
        if k == "montant" and d.get("montant") not in (None, "") and abs(float(d["montant"]) - float(v)) > 1:
            d["alerte"] = f"montant de la capture {v:,.0f} € différent de la ligne".replace(",", " ")
            continue
        if k in ("montant", "achats", "mo", "marge", "jp", "ha", "alerte") and v not in (None, ""):
            if k in ("jp", "ha") and d.get(k) not in (None, ""): continue   # ce que l'équipe a saisi reste
            d[k] = v
    d["lu"] = True
    req("POST", "/rest/v1/devis", {"id": devis, "data": d}, {"Prefer": "resolution=merge-duplicates"})
    print(devis, "noté :", {k: d.get(k) for k in ("montant", "achats", "mo", "marge", "jp", "ha", "alerte")})


if __name__ == "__main__":
    if sys.argv[1] == "liste": liste(sys.argv[2])
    elif sys.argv[1] == "note": note(sys.argv[2], json.loads(sys.argv[3]))
