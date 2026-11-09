#!/usr/bin/env python3
"""Sauvegarde hebdomadaire de l'appli Chantiers MGDS vers le serveur (Steven, 09/11/2026).

Tourne sur le Mac du bureau, sans rien installer (Python 3 du Mac, bibliothèque standard seulement).
À chaque lancement :
  - toutes les tables de la base (chantiers, comptes, stock, mouvements, réservations, atelier, planning, heures,
    photos…) en JSON (pour tout restaurer) et en CSV (lisible dans Excel), dans un dossier daté AAAA-MM-JJ ;
  - les fichiers stockés dans l'appli (devis, fiches, photos) dans un dossier « fichiers » commun :
    seuls les nouveaux fichiers sont téléchargés, rien n'est jamais effacé ;
  - une copie du site publié (pages de l'appli) dans le dossier daté ;
  - on garde les 12 derniers dossiers datés (environ 3 mois), les plus anciens sont supprimés.

Connexion : compte « sauvegarde » de l'appli (lecture seule). Son e-mail et son mot de passe sont dans
~/.mgds-sauvegarde (deux lignes : e-mail puis mot de passe), fichier lisible par le seul utilisateur du Mac.

Usage : python3 sauvegarde.py "/chemin/du/dossier/Sauvegardes"   [--max-fichiers N pour un essai]
"""
import csv, datetime, io, json, os, shutil, ssl, sys, time, urllib.error, urllib.parse, urllib.request

SB_URL = "https://azgvzgenfykvlkuwevty.supabase.co"
SB_KEY = "sb_publishable_Is-KNNP223DIxMk8kzrYww_PynSCb23"  # clé publique de l'appli (la même que dans les pages)
SITE = "https://chantiers-mgds.netlify.app"
PAGES = ["index.html", "poseurs.html", "plan-stock.html", "fiche-stock.html", "guide-stock.html", "theme-mac.css",
         "manifest.json", "manifest-poseurs.json", "icon.svg", "icon-180.png", "icon-512.png", "outil/shim.js"]
BUCKETS = ["documents", "photos"]
GARDER = 12

CTX = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
TOKEN = None
LOG = []


def log(msg):
    line = time.strftime("%H:%M:%S ") + msg
    LOG.append(line)
    print(line, flush=True)


def http(method, url, body=None, headers=None, raw=False, essais=4):
    h = {"apikey": SB_KEY, **({"Authorization": "Bearer " + TOKEN} if TOKEN else {}), **(headers or {})}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        h.setdefault("Content-Type", "application/json")
    for n in range(essais):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, method=method, headers=h), context=CTX, timeout=120) as r:
                b = r.read()
                return (b, dict(r.headers)) if raw else (json.loads(b) if b else None)
        except urllib.error.HTTPError as e:
            if e.code < 500 or n == essais - 1:
                raise RuntimeError(f"{method} {url.split('?')[0]} : {e.code} {e.read()[:200]!r}")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if n == essais - 1:
                raise RuntimeError(f"{method} {url.split('?')[0]} : {e}")
        time.sleep(2 ** (n + 1))


def connexion():
    global TOKEN
    if os.environ.get("MGDS_EMAIL"):  # pour un essai sans fichier de mot de passe
        email, mdp = os.environ["MGDS_EMAIL"], os.environ["MGDS_MDP"]
    else:
        cfg = os.path.expanduser("~/.mgds-sauvegarde")
        email, mdp = [l.strip() for l in open(cfg, encoding="utf-8").read().splitlines()[:2]]
    r = http("POST", SB_URL + "/auth/v1/token?grant_type=password", {"email": email, "password": mdp})
    TOKEN = r["access_token"]
    log(f"connecté avec {email}")


def tables():
    spec = http("GET", SB_URL + "/rest/v1/")
    return sorted(p.strip("/") for p in spec.get("paths", {}) if p.count("/") == 1 and not p.startswith("/rpc") and p != "/")


def export_table(t, dossier):
    rows, pas = [], 1000
    while True:
        b, h = http("GET", f"{SB_URL}/rest/v1/{urllib.parse.quote(t)}?select=*", headers={"Range-Unit": "items", "Range": f"{len(rows)}-{len(rows) + pas - 1}"}, raw=True)
        lot = json.loads(b)
        rows += lot
        if len(lot) < pas:
            break
    with open(os.path.join(dossier, t + ".json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    cols = []
    for r in rows:
        cols += [k for k in r if k not in cols]
    with open(os.path.join(dossier, t + ".csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(cols)
        for r in rows:
            w.writerow([json.dumps(r.get(k), ensure_ascii=False) if isinstance(r.get(k), (dict, list)) else r.get(k) for k in cols])
    return len(rows)


def lister(bucket, prefixe=""):
    out, debut = [], 0
    while True:
        lot = http("POST", f"{SB_URL}/storage/v1/object/list/{bucket}", {"prefix": prefixe, "limit": 1000, "offset": debut, "sortBy": {"column": "name", "order": "asc"}})
        for x in lot:
            chemin = (prefixe + "/" if prefixe else "") + x["name"]
            if x.get("id") is None:
                out += lister(bucket, chemin)
            else:
                out.append((chemin, (x.get("metadata") or {}).get("size")))
        if len(lot) < 1000:
            return out
        debut += 1000


def fichiers(racine, max_fichiers=None):
    nouveaux = deja = erreurs = 0
    for bucket in BUCKETS:
        try:
            liste = lister(bucket)
        except RuntimeError as e:
            log(f"stockage {bucket} : liste impossible ({e})")
            erreurs += 1
            continue
        for chemin, taille in liste:
            dest = os.path.join(racine, bucket, *chemin.split("/"))
            if os.path.exists(dest) and (taille is None or os.path.getsize(dest) == taille):
                deja += 1
                continue
            if max_fichiers is not None and nouveaux >= max_fichiers:
                continue
            try:
                b, _ = http("GET", f"{SB_URL}/storage/v1/object/authenticated/{bucket}/{urllib.parse.quote(chemin)}", raw=True)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest + ".part", "wb") as f:
                    f.write(b)
                os.replace(dest + ".part", dest)
                nouveaux += 1
            except RuntimeError as e:
                log(f"fichier {bucket}/{chemin} : {e}")
                erreurs += 1
    return nouveaux, deja, erreurs


def site(dossier):
    n = 0
    for p in PAGES:
        try:
            with urllib.request.urlopen(SITE + "/" + p, context=CTX, timeout=60) as r:
                dest = os.path.join(dossier, *p.split("/"))
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                open(dest, "wb").write(r.read())
                n += 1
        except Exception as e:
            log(f"site {p} : {e}")
    return n


def menage(racine):
    dates = sorted(d for d in os.listdir(racine) if len(d) == 10 and d[4] == "-" and d[7] == "-" and os.path.isdir(os.path.join(racine, d)))
    for d in dates[:-GARDER]:
        shutil.rmtree(os.path.join(racine, d))
        log(f"ancienne sauvegarde {d} supprimée (on garde les {GARDER} dernières)")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    racine = os.path.abspath(sys.argv[1])
    if not os.path.isdir(racine):  # serveur non branché : on ne crée surtout pas un dossier local à la place
        print(f"Dossier de sauvegarde introuvable (serveur non connecté ?) : {racine}")
        sys.exit(2)
    max_f = int(sys.argv[sys.argv.index("--max-fichiers") + 1]) if "--max-fichiers" in sys.argv else None
    jour = datetime.date.today().isoformat()
    dossier = os.path.join(racine, jour)
    os.makedirs(os.path.join(dossier, "base"), exist_ok=True)
    ok = True
    try:
        connexion()
        total = 0
        for t in tables():
            try:
                n = export_table(t, os.path.join(dossier, "base"))
                total += n
                log(f"table {t} : {n} lignes")
            except RuntimeError as e:
                ok = False
                log(f"table {t} : ERREUR {e}")
        nv, deja, err = fichiers(os.path.join(racine, "fichiers"), max_f)
        ok = ok and not err
        log(f"fichiers : {nv} nouveaux, {deja} déjà sauvegardés, {err} erreurs")
        log(f"site : {site(os.path.join(dossier, 'site'))} fichiers copiés")
        menage(racine)
    except Exception as e:
        ok = False
        log(f"ERREUR : {e}")
    etat = "OK" if ok else "À VÉRIFIER"
    log(f"sauvegarde du {jour} : {etat}")
    with open(os.path.join(dossier, "journal.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(LOG) + "\n")
    with open(os.path.join(racine, "DERNIERE-SAUVEGARDE.txt"), "w", encoding="utf-8") as f:
        f.write(f"{jour} : {etat}\nDétail : {jour}/journal.txt\n")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
