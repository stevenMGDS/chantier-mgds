"""Fiches remplies dans l'appli -> dossier POSE du chantier sur le serveur (règles de Steven du 13/11/2026).

  python3 -I fiches_pose.py           envoie ce qui a changé
  python3 -I fiches_pose.py essai     montre ce qui serait envoyé, sans rien déposer

Règles :
- une fiche n'est envoyée que remplie dans l'appli (jamais de modèle vierge) ;
- chaque modification remplace le PDF précédent sur le serveur (canal vers-serveur-remplacer/, l'iMac garde l'ancien
  dans _PROCESS CLAUDE/archives-fiches/<date>/) ;
- sauf la fiche de réception de chantier : chaque modification devient un nouveau PDF daté (canal vers-serveur/, sans
  écraser), pour garder la trace des levées de réserves.
Le dossier du chantier vient de serveur/_liens.json, déposé par l'iMac à chaque synchronisation.
Ce qui a déjà été envoyé est noté dans documents/claude/fiches-envoyees.json (empreinte du PDF).
"""
import datetime, hashlib, json, re, sys, unicodedata, urllib.parse, urllib.request

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x"}  # l'hôte est authentifié par le proxy de l'environnement
ETAT = "claude/fiches-envoyees.json"
FICHES = {"Préparation", "Métré", "Support", "Réception"}


def req(method, path, body=None, extra=None, raw=False):
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    h = {**H, **(extra or {})}
    if body is not None and not isinstance(body, bytes): h["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=h, method=method)) as r:
        b = r.read()
        return b if raw else (json.loads(b) if b else None)


def q(p): return urllib.parse.quote(p)
def sans_accents(s): return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()


def lire(path, defaut):
    try: return json.loads(req("GET", "/storage/v1/object/documents/" + q(path), raw=True))
    except Exception: return defaut


def deposer(path, octets, ctype, ecraser):
    req("POST", "/storage/v1/object/documents/" + q(path), octets, {"Content-Type": ctype, **({"x-upsert": "true"} if ecraser else {})})


def nom_fiche(doc):
    n = re.sub(r"\s*\((remplissable|remplie?)\)\s*", " ", doc.get("name") or doc["type"])
    n = re.sub(r"\.pdf$", "", n, flags=re.I).replace("_", " ")
    return re.sub(r"\s+", " ", sans_accents(n)).strip()


def main(essai):
    liens = (lire("serveur/_liens.json", {}) or {}).get("chantiers") or {}
    etat = lire(ETAT, {})
    if not liens: print("serveur/_liens.json introuvable : rien envoyé (la synchronisation de l'iMac le dépose)"); return
    maintenant = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=1)))
    n = 0
    for r in req("GET", "/rest/v1/chantiers?select=id,data&order=id"):
        L = liens.get(r["id"])
        if not L or L.get("termine"): continue
        chemin = sans_accents(L.get("chemin") or L.get("dossier") or "")
        if not chemin: continue
        for doc in r["data"].get("docs") or []:
            if doc.get("type") not in FICHES or not doc.get("rempli") or not str(doc.get("id", "")).startswith("app/"): continue
            pdf = req("GET", "/storage/v1/object/documents/" + q(doc["id"]), raw=True)
            sha = hashlib.sha256(pdf).hexdigest()
            if (etat.get(doc["id"]) or {}).get("sha") == sha: continue
            base = nom_fiche(doc)
            if doc["type"] == "Réception":   # réception de chantier : une version par modification
                cible = f"vers-serveur/{chemin}/POSE/{base} - {maintenant:%Y-%m-%d %Hh%M}.pdf"
            else:
                cible = f"vers-serveur-remplacer/{chemin}/POSE/{base}.pdf"
            print(("ESSAI " if essai else "") + f"{r['id']} : {doc['type']} -> {cible}")
            if not essai:
                deposer(cible, pdf, "application/pdf", ecraser=cible.startswith("vers-serveur-remplacer/"))
                etat[doc["id"]] = {"sha": sha, "cible": cible, "le": maintenant.isoformat(timespec="minutes"), "chantier": r["id"]}
            n += 1
    if n and not essai: deposer(ETAT, json.dumps(etat, ensure_ascii=False, indent=1).encode(), "application/json", ecraser=True)
    print(f"{n} fiche(s) {'à envoyer' if essai else 'déposée(s) pour le serveur (copiées au prochain passage de l iMac)'}")


if __name__ == "__main__":
    main(len(sys.argv) > 1 and sys.argv[1] == "essai")
