#!/usr/bin/env python3
"""Veille atelier : dossiers ATELIER du serveur -> onglet Atelier de l'appli.

Consigne de Steven (06/11/2026) :
- dans chaque dossier chantier du dossier des commandes, un sous-dossier « ATELIER » rempli = une production atelier
  (bons de commande matière, vitrages…). Les documents les plus récents font foi ;
- le dossier « ATELIER » à la racine des commandes contient les dossiers hors pose MGDS (revente, chantiers annexes) :
  ceux qui existent au premier passage sont clos ; ensuite, tout nouveau dossier devient une commande atelier ;
- pas de tableau Excel (consigne du 06/11/2026) : Christophe coche ses étapes dans l'appli, l'outil ne fait que compléter
  ce qui n'y est pas encore noté, d'après les documents du serveur.

En deux étapes (une tâche planifiée ne peut pas avoir à la fois le Mac et l'environnement « MGDS Supabase ») :
1) sur le Mac, lister les dossiers (commande donnée dans la tâche planifiée) dans liste.txt, lignes :
     A|<chemin d'un dossier atelier>   D|<chemin d'un sous-dossier>   F|AAAA-MM-JJ|taille|<chemin d'un fichier>
   puis : python3 -I atelier_sync.py export --racine "<dossier des commandes>" --liste liste.txt > atelier.json
   (aucun appel réseau) ;
2) dans l'environnement « MGDS Supabase » : python3 -I atelier_sync.py import atelier.json [--essai]
   crée ou complète les commandes atelier et affiche un résumé. N'efface jamais rien.
Accès : l'hôte Supabase est authentifié par le proxy de l'environnement « MGDS Supabase ».
"""
import datetime, json, math, os, re, sys, unicodedata, urllib.request

URL = "https://azgvzgenfykvlkuwevty.supabase.co/rest/v1"
H = {"apikey": "x", "Authorization": "Bearer x", "Content-Type": "application/json"}
H_JOUR = 7
DEVIS = re.compile(r"\bD ?(\d{9})(?!\d)")
DELAIS = {"mat": 2, "acc": 1, "vitr": 2, "volet": 3}
ON = {"mat": True, "acc": False, "vitr": True, "volet": False}
VIDES = {"CONSTRUCTION", "VILLE", "ORLEANS", "IMMOBILIER", "VILLAGE", "ENTREPRISE", "PORTE", "ENTREE", "SAFETY",
         "LOFTS", "GLOBALE", "SYSTEM", "ATELIER", "CHANTIER", "COMMANDE", "COMMANDES", "MGDS"}



def plain(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().upper()


# ---------- dates (jours ouvrés lundi-vendredi) ----------
D = datetime.date.fromisoformat
iso = lambda d: d.isoformat()
def next_jo(s):
    d = D(s)
    while d.weekday() > 4: d += datetime.timedelta(1)
    return iso(d)
def prev_jo(s):
    d = D(s)
    while d.weekday() > 4: d -= datetime.timedelta(1)
    return iso(d)
def add_days(s, n): return iso(D(s) + datetime.timedelta(n))
def add_jo(s, n):
    st = -1 if n < 0 else 1
    d = D(prev_jo(s) if n < 0 else next_jo(s))
    k = abs(n)
    while k:
        d += datetime.timedelta(st)
        if d.weekday() < 5: k -= 1
    return iso(d)
def fri(s):
    d = D(s)
    return iso(d + datetime.timedelta(4 - d.weekday()))
def week_fri(y, w):
    return iso(datetime.date.fromisocalendar(y, w, 5))


# ---------- étape 1 : export (Mac, sans réseau) ----------
TECHNAL = re.compile(r"^20(20|45)\d{6}\.PDF$")   # confirmations Technal : 2045xxxxxx.PDF, 2020xxxxxx.PDF


def classe(nom):
    """Type d'un document du dossier ATELIER, d'après son nom (relevé sur le serveur le 06/11/2026).
    Seuls mat, acc, vitr, volet font avancer les dates ; les autres sont affichés pour information."""
    n = plain(os.path.basename(nom))
    if re.search(r"\bARC\b.*RIOU|RIOU.*\bARC\b", n) or re.search(r"COMMANDE.*VITR|VITR.*COMMANDE", n): return "vitr"
    if re.search(r"VITR|VERRE|GLASS|PERFOGLASS", n): return "vitrp"          # étude / consultation vitrages
    if TECHNAL.match(n) or re.search(r"\bTECHNAL\b", n): return "mat"
    if re.search(r"VOLET|STORE|BUBENDORFF|SOMFY|PROFALUX", n): return "volet"
    if re.search(r"FOUSS|QUINCAIL|ACCESSOIRE", n): return "acc"
    if n.startswith("DEVIS"): return "devis"
    if n.startswith("OFFRE"): return "offre"
    if re.search(r"^COUPES?\b|\.DWG$|\.DXF", n): return "plan"
    return ""


def termine(rel):
    return plain(rel.split("/")[0]).startswith("Z.TERMIN")


def export(racine, liste):
    """Production MGDS = sous-dossier « ATELIER » (nom exact) non vide d'un dossier chantier ;
    production hors pose MGDS = dossier « ATELIER <client> » à la racine des commandes.
    Tout ce qui est rangé dans Z.TERMINÉS est ignoré (dossiers clos)."""
    racine = racine.rstrip("/")
    ateliers, fichiers = [], []
    for ligne in open(liste, encoding="utf-8", errors="replace"):
        ligne = ligne.rstrip("\n")
        if ligne.startswith("A|"): ateliers.append(ligne[2:].rstrip("/"))
        elif ligne.startswith("F|"):
            p = ligne.split("|", 3)
            if len(p) == 4: fichiers.append({"d": p[1], "taille": p[2], "chemin": p[3]})
    out = {"genere": datetime.datetime.now().isoformat(timespec="minutes"), "productions": [], "hors": []}
    def docs(dossier):
        fs = [f for f in fichiers if f["chemin"].startswith(dossier + "/") and not plain(f["chemin"]).endswith("THUMBS.DB")]
        fs.sort(key=lambda f: f["d"], reverse=True)   # les plus récents d'abord
        return [{"n": os.path.relpath(f["chemin"], dossier), "d": f["d"], "t": classe(f["chemin"])} for f in fs[:25]]
    for a in sorted(set(ateliers)):
        rel = os.path.relpath(a, racine)
        if rel.startswith("..") or termine(rel): continue
        nom = plain(os.path.basename(a))
        if nom == "ATELIER" and os.path.dirname(a) != racine:
            ds = docs(a)
            if ds: out["productions"].append({"dossier": os.path.relpath(os.path.dirname(a), racine), "src": rel, "docs": ds})
        elif nom.startswith("ATELIER ") and os.path.dirname(a) == racine:
            out["hors"].append({"nom": os.path.basename(a)[len("ATELIER "):].strip(" -"), "src": rel, "docs": docs(a)})
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)


def depuis_ancien(j):
    """Liste produite avant le 06/11/2026 14 h : retire Z.TERMINÉS et récupère les sous-dossiers ATELIER mal rangés."""
    prods = [p for p in j.get("productions", []) if not termine(p["src"]) and plain(os.path.basename(p["src"])) == "ATELIER"]
    for h in j.get("hors", []):
        if plain(os.path.basename(h["src"])) == "ATELIER" and h.get("docs") and not termine(h["src"]):
            prods.append({"dossier": os.path.dirname(h["src"]).strip(), "src": h["src"], "docs": h["docs"]})
    hors = [h for h in j.get("hors", []) if plain(os.path.basename(h["src"])).startswith("ATELIER ") and not termine(h["src"])]
    return {**j, "productions": prods, "hors": hors}


# ---------- étape 2 : import (environnement MGDS Supabase) ----------
def req(method, path, body=None, extra=None):
    r = urllib.request.Request(URL + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={**H, **(extra or {})})
    with urllib.request.urlopen(r) as x:
        t = x.read()
        return json.loads(t) if t else None


def merge(a, b):
    o = dict(a) if isinstance(a, dict) else {}
    for k, v in b.items():
        o[k] = merge(o[k], v) if isinstance(v, dict) and isinstance(o.get(k), dict) else v
    return o


def sd(c, k):
    v = ((c or {}).get("steps") or {}).get(k)
    return v.get("d", "") if isinstance(v, dict) else ""


def pose_ref(c):
    if not c: return ""
    ok = sd(c, "posevalid")
    if ok: return ok
    ds = sorted(x for x in [sd(c, "poseprop"), c.get("pose2") or ""] if x)
    return ds[0] if ds else ""


def cmd(a, k):
    x = {"on": ON[k], "sem": DELAIS[k]}
    x.update((a.get("cmds") or {}).get(k) or {})
    return x


def done_d(a, k, chantiers):
    st = a.get("steps") or {}
    if k in DELAIS:
        v = cmd(a, k).get("cmd"); return v.get("d", "") if isinstance(v, dict) else ""
    if k == "recu":
        ks = [q for q in DELAIS if cmd(a, q)["on"]]
        if ks:
            r = [cmd(a, q).get("recu") for q in ks]
            return max(x["d"] for x in r) if all(isinstance(x, dict) and x.get("d") for x in r) else ""
    if k == "metre":
        c = chantiers.get(a.get("chantier") or "")
        if c and sd(c, "metre"): return sd(c, "metre")
    v = st.get(k)
    return v.get("d", "") if isinstance(v, dict) else ""


def plan(a, chantiers):
    """Même calcul que l'appli (atlPlan) : fin de production prévue et rétro-planning."""
    t = datetime.date.today().isoformat()
    c = chantiers.get(a.get("chantier") or "")
    besoin = a.get("besoin") or pose_ref(c)
    pj = max(1, math.ceil((float(a.get("heures") or 0)) / H_JOUR))
    ks = [k for k in DELAIS if cmd(a, k)["on"]]
    L, P = {}, {}
    if besoin:
        L["fin"] = add_jo(besoin, -1); L["debut"] = add_jo(L["fin"], -(pj - 1)); L["recu"] = add_jo(L["debut"], -1)
        for k in ks: L[k] = prev_jo(add_days(L["recu"], -7 * int(float(cmd(a, k)["sem"] or 0))))
    arc = done_d(a, "arc", chantiers)
    for k in ks:
        x = cmd(a, k)
        if isinstance(x.get("recu"), dict) and x["recu"].get("d"): P[k] = x["recu"]["d"]
        elif x.get("prev"): P[k] = x["prev"]
        else:
            base = x["cmd"]["d"] if isinstance(x.get("cmd"), dict) and x["cmd"].get("d") else (max(t, arc) if k in ("vitr", "volet") else t)
            P[k] = next_jo(add_days(base, 7 * int(float(x["sem"] or 0))))
    recu = done_d(a, "recu", chantiers) or max([t] + [P[k] for k in ks])
    deb = done_d(a, "debut", chantiers) or max(next_jo(t), add_jo(recu, 1))
    fin = done_d(a, "fin", chantiers) or a.get("finManu") or max(next_jo(t), add_jo(deb, pj - 1))
    return {"fin": fin, "finSem": fri(fin), "besoin": besoin}, L


def trouve_chantier(texte, chantiers):
    m = DEVIS.search(plain(texte))
    if m and ("D" + m.group(1)) in chantiers: return "D" + m.group(1)
    p = plain(texte)
    score = {}
    for cid, c in chantiers.items():
        mots = set(w for w in re.findall(r"[A-Z]{4,}", plain(c.get("client"))) if w not in VIDES)
        n = sum(1 for w in mots if re.search(r"\b" + re.escape(w) + r"\b", p))
        if n: score[cid] = n
    if not score: return ""
    best = max(score.values()); top = [k for k, v in score.items() if v == best]
    return top[0] if len(top) == 1 else ""   # le chantier qui partage le plus de mots, s'il est seul


def importe(fichier, essai):
    j = depuis_ancien(json.load(open(fichier, encoding="utf-8")))
    for p in j.get("productions", []) + j.get("hors", []):
        for d in p.get("docs", []): d["t"] = classe(d["n"])   # classement à jour, même pour une liste ancienne
    chantiers = {r["id"]: r["data"] for r in req("GET", "/chantiers?select=id,data")}
    rows = {r["id"]: r for r in req("GET", "/atelier?select=id,data,version")}
    today = datetime.date.today().isoformat()
    pre = "AT" + today[2:4] + "-"
    num = [max([0] + [int(k[len(pre):]) for k in rows if k.startswith(pre) and k[len(pre):].isdigit()])]
    resume = {"crees": [], "maj": [], "sans_chantier": [], "hors_nouveaux": [], "a_valider": []}

    def nouveau_id():
        num[0] += 1
        return pre + str(num[0]).zfill(3)

    def ecrit(aid, patch, nouveau=False):
        base = {} if nouveau else rows[aid]["data"]
        data = merge(base, patch)
        data["calc"], _ = plan(data, chantiers)
        if not nouveau and data == base: return False
        if essai:
            rows[aid] = {"id": aid, "data": data, "version": 0}; return True
        if nouveau:
            req("POST", "/atelier", {"id": aid, "data": data})
            rows[aid] = {"id": aid, "data": data, "version": 1}
        else:
            for _ in range(5):
                cur = req("GET", f"/atelier?id=eq.{aid}&select=data,version")[0]
                d2 = merge(cur["data"], patch); d2["calc"], _ = plan(d2, chantiers)
                ok = req("PATCH", f"/atelier?id=eq.{aid}&version=eq.{cur['version']}", {"data": d2}, {"Prefer": "return=representation"})
                if ok: rows[aid] = ok[0]; break
            else:
                raise SystemExit(f"{aid} : écriture impossible (conflit)")
        return True

    def par_src(src):
        return next((k for k, r in rows.items() if (r["data"] or {}).get("src") == src), None)

    def depuis_docs(a, docs):
        """Dates déduites des documents du serveur (le plus récent de chaque type), seulement là où rien n'est noté."""
        patch, vus = {}, set()
        for d in docs:   # déjà triés du plus récent au plus ancien
            t = d.get("t")
            if t in DELAIS and t not in vus:
                vus.add(t); x = cmd(a, t)
                if not (isinstance(x.get("cmd"), dict) and x["cmd"].get("d")):
                    patch.setdefault("cmds", {})[t] = {"on": True, "cmd": {"d": d["d"], "by": "serveur"}}
                elif not x["on"]:
                    patch.setdefault("cmds", {})[t] = {"on": True}
        return patch

    # 1. dossiers ATELIER des chantiers MGDS
    for p in j.get("productions", []):
        aid = par_src(p["src"])
        cid = trouve_chantier(p["dossier"], chantiers)
        serveur = [{"n": d["n"], "d": d["d"], "t": d.get("t", "")} for d in p["docs"][:40]]
        if not aid:
            aid = nouveau_id()
            c = chantiers.get(cid) or {}
            a = {"dest": "mgds", "chantier": cid, "client": "" if cid else p["dossier"], "objet": "", "heures": 0,
                 "devis": cid, "besoin": "", "finManu": "", "bloque": "", "notes": "", "cmds": {}, "lignes": [], "docs": [],
                 "steps": {"devis": {"d": sd(c, "signe") or next((d["d"] for d in p["docs"] if d["t"] == "devis"), p["docs"][-1]["d"]), "by": "serveur"}},
                 "cree": today, "arcRef": aid, "src": p["src"], "serveur": serveur, "serveurLe": j.get("genere", "")}
            a["_id"] = aid; patch = depuis_docs(a, p["docs"]); a.pop("_id")
            ecrit(aid, merge(a, patch), nouveau=True)
            resume["crees"].append(f"{aid} : {p['dossier']}" + ("" if cid else " (pas de chantier dans l'appli)"))
            if not cid: resume["sans_chantier"].append(p["dossier"])
        else:
            a = dict(rows[aid]["data"]); a["_id"] = aid
            patch = {"serveur": serveur, "serveurLe": j.get("genere", "")}
            patch = merge(patch, depuis_docs(a, p["docs"]))
            if cid and not a.get("chantier"): patch["chantier"] = cid
            if ecrit(aid, patch) and set(patch) - {"serveur", "serveurLe"}: resume["maj"].append(f"{aid} : {p['dossier']} (documents du serveur)")

    # 2. dossiers « ATELIER <client> » à la racine des commandes : productions hors pose MGDS (revente, chantiers annexes).
    #    Ceux d'avant sont rangés dans Z.TERMINÉS (clos, ignorés) : tout dossier présent à la racine est donc en cours.
    for h in j.get("hors", []):
        if par_src(h["src"]): continue
        aid = nouveau_id()
        a = {"dest": "revente", "chantier": "", "client": h["nom"], "objet": "", "heures": 0, "devis": "", "besoin": "",
             "finManu": "", "bloque": "", "notes": "", "cmds": {}, "lignes": [], "docs": [],
             "steps": {"devis": {"d": next((d["d"] for d in h["docs"] if d["t"] == "devis"), today), "by": "serveur"}},
             "cree": today, "arcRef": aid, "src": h["src"], "serveur": h["docs"][:40], "serveurLe": j.get("genere", "")}
        a["_id"] = aid; patch = depuis_docs(a, h["docs"]); a.pop("_id")
        ecrit(aid, merge(a, patch), nouveau=True)
        resume["hors_nouveaux"].append(f"{aid} : {h['nom']}")

    print(json.dumps(resume, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    a = sys.argv[1:]
    def opt(n):
        return a[a.index(n) + 1] if n in a else None
    if a and a[0] == "export":
        export(opt("--racine"), opt("--liste"))   # --suivi (ancien tableau Excel) est ignoré
    elif a and a[0] == "import" and len(a) > 1:
        importe(a[1], "--essai" in a)
    else:
        print(__doc__)
