"""Fiches de fabrication des commandes atelier, lues par Claude (consigne de Steven du 12/11/2026).

  python3 -I fiches_atelier.py lire     nouvelles fiches (stockage documents/serveur/<dossier>/ATELIER/FICHES DE FABRICATION/*.pdf)
                                        -> besoins de la commande atelier + proposition de réservation « à confirmer par Christophe »
  python3 -I fiches_atelier.py excel    propositions confirmées par Christophe -> Excel « Accessoires à commander »
                                        déposé dans documents/vers-serveur/<dossier>/ATELIER/ (recopié sur le serveur par le Mac)

Toutes les fiches d'un dossier sont additionnées. Quantités en pièces (quincailleries) et en mètres (joints : le stock atelier
des joints est compté en mètres, confirmé par Steven le 13/11/2026 ; besoin arrondi au mètre supérieur).
Claude ne réserve jamais lui-même : seul Christophe valide (bouton dans l'appli). Aucun prix n'est lu.
Il faut pypdf et openpyxl (pip install pypdf openpyxl si absents).
"""
import collections, datetime, io, json, math, re, sys, unicodedata, urllib.parse, urllib.request

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x"}  # l'hôte est authentifié par le proxy de l'environnement
FICHES = "FICHES DE FABRICATION"
FIN = r"(SANS|MF|X[A-Z]+|[A-Z]{1,3}\d{3,4}\.\d{3}|YBLC\.\d{3})"


def req(method, path, body=None, extra=None, raw=False):
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    h = {**H, **(extra or {})}
    if body is not None and not isinstance(body, bytes): h["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=h, method=method)) as r:
        b = r.read()
        return b if raw else (json.loads(b) if b else None)


def q(p): return urllib.parse.quote(p)


def tout(path):
    """Lecture par pages de 1000 lignes (la base n'en rend pas plus d'un coup)."""
    out, o = [], 0
    while True:
        r = req("GET", f"{path}&order=id&offset={o}&limit=1000"); out += r
        if len(r) < 1000: return out
        o += 1000
def sans_accents(s): return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
def norm(s): return re.sub(r"[\s.]", "", str(s or "")).upper()
def auj(): return datetime.date.today().isoformat()


def ls(prefix):
    return req("POST", "/storage/v1/object/list/documents", {"prefix": prefix, "limit": 1000})


def fiches_par_dossier():
    out = {}
    for d in ls("serveur/"):
        dos = d["name"]
        pdfs = [f["name"] for f in ls(f"serveur/{dos}/ATELIER/{FICHES}/") if f["name"].lower().endswith(".pdf")]
        if pdfs: out[dos] = sorted(f"serveur/{dos}/ATELIER/{FICHES}/{p}" for p in pdfs)
    return out


def lire_pdf(octets):
    """Quincailleries (pièces) et joints (m), multipliés par la quantité de chaque ligne étude."""
    import pypdf
    txt = "\n".join(p.extract_text() for p in pypdf.PdfReader(io.BytesIO(octets)).pages)
    out = collections.OrderedDict()
    sect, qte, une = None, 1, False
    for l in (x.strip() for x in txt.splitlines()):
        m = re.match(r"Repère : (.*) Quantité : (\d+)", l)
        if m: qte, une, sect = int(m.group(2)), False, None; continue
        if l.startswith("Matières pour UNE unité"): une = True; continue
        if l in ("Profilés", "Profilés additionnels"): sect = "profil"; continue
        if l == "Joints": sect = "joint"; continue
        if l == "Quincailleries": sect = "quinc"; continue
        if l.startswith("Articles pièce additionnels") or l.startswith("Vitrages et Panneaux"): sect = None; continue
        mult = qte if une else 1
        if sect == "quinc":
            m = re.match(r"(\S+) (.*?) " + FIN + r" (\d+)$", l)
            if m:
                o = out.setdefault(("quinc", m.group(1), m.group(3)), {"des": m.group(2), "q": 0}); o["q"] += int(m.group(4)) * mult
        elif sect == "joint":
            m = re.match(r"(\S+) (.*?) " + FIN + r" (\d+) (\d{1,3}(?: \d{3})*)$", l)
            if m:
                o = out.setdefault(("joint", m.group(1), m.group(3)), {"des": m.group(2), "q": 0})
                o["q"] += int(m.group(5).replace(" ", "")) * int(m.group(4)) * mult / 1000
    return out


def lire_fiches(chemins):
    tot = collections.OrderedDict()
    for c in chemins:
        for k, o in lire_pdf(req("GET", "/storage/v1/object/documents/" + q(c), raw=True)).items():
            t = tot.setdefault(k, {"des": o["des"], "q": 0}); t["q"] += o["q"]
    return tot


def commandes():
    return {r["id"]: r for r in req("GET", "/rest/v1/atelier?select=id,data,version&order=id")}


def commande_du_dossier(C, chemins):
    """La commande dont la liste « serveur » (relevée par la synchro) contient une de ces fiches."""
    noms = {sans_accents(c.split(f"/{FICHES}/")[1]).lower() for c in chemins}
    for cid, r in C.items():
        for f in (r["data"].get("serveur") or []):
            n = f.get("n", "")
            if n.startswith(FICHES + "/") and sans_accents(n[len(FICHES) + 1:]).lower() in noms: return cid
    return None


def maj(cid, patch):
    """Fusion de premier niveau, avec le compteur de version (comme l'appli)."""
    for _ in range(6):
        r = req("GET", f"/rest/v1/atelier?select=data,version&id=eq.{q(cid)}")[0]
        u = req("PATCH", f"/rest/v1/atelier?id=eq.{q(cid)}&version=eq.{r['version']}", {"data": {**r["data"], **patch}},
                {"Prefer": "return=representation"})
        if u: return
    raise SystemExit("conflit d'écriture sur " + cid)


def lire():
    C, F = commandes(), fiches_par_dossier()
    for dos, chemins in F.items():
        cid = commande_du_dossier(C, chemins)
        if not cid: print(f"{dos} : {len(chemins)} fiche(s), aucune commande atelier reliée (synchro pas encore passée ?)"); continue
        d = C[cid]["data"]; P = d.get("propClaude") or {}
        if sorted(P.get("fiches") or ([P["fiche"]] if P.get("fiche") else [])) == chemins:
            print(f"{cid} {dos} : fiches déjà lues"); continue
        tot = lire_fiches(chemins)
        noms = ", ".join(c.rsplit("/", 1)[1].split("_Fiche")[0] for c in chemins)
        src = f"fiche {noms} {datetime.date.today():%d/%m}"
        N = [{"ref": r, "col": "", "lg": None, "q": int(o["q"]) if s == "quinc" else math.ceil(o["q"]),
              "des": o["des"] if s == "quinc" else o["des"] + " (en m)", "fin": f, "src": src}
             for (s, r, f), o in tot.items() if s in ("quinc", "joint")]
        garde = [b for b in (d.get("besoins") or []) if not str(b.get("src", "")).startswith("fiche ")]
        prop = {"statut": "a_confirmer", "le": auj(), "lignes": len(N), "fiches": chemins, "fiche": chemins[-1],
                "src": "la fiche de fabrication Technal " + noms if len(chemins) == 1 else f"les {len(chemins)} fiches de fabrication ({noms})"}
        maj(cid, {"besoins": garde + N, "propClaude": prop})
        print(f"{cid} {dos} : {len(N)} références lues dans {len(chemins)} fiche(s), proposition à confirmer par Christophe")


def excel():
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    from openpyxl.utils import get_column_letter
    C = commandes()
    A = [a for a in tout("/rest/v1/stock_articles?select=id,ref,famille,unite,emplacement,actif&stock=eq.atelier")
         if a["actif"] is not False and a["famille"] not in ("Barres", "Chutes")]
    N = {x["id"]: float(x["niveau"]) for x in tout("/rest/v1/stock_niveaux?select=id,niveau")}
    RS = tout("/rest/v1/stock_reservations?select=id,article,commande,qte,note")
    idx = {}
    for a in A:
        k = norm(a["ref"]); idx.setdefault(k, []).append(a)
        if k.startswith("T"): idx.setdefault(k[1:], []).append(a)
    for cid, r in C.items():
        d = r["data"]; P = d.get("propClaude") or {}
        if P.get("statut") == "a_confirmer" and any(x["commande"] == cid and str(x.get("note") or "").startswith("Besoin ") for x in RS):
            # Christophe a réservé avec « 📌 Réserver ce qui est en stock » (version de l'appli sans bouton de confirmation)
            P = {**P, "statut": "confirmee", "par": "Christophe (bouton Réserver)", "d": auj()}
        if P.get("statut") != "confirmee" or P.get("excel"): continue
        chemins = P.get("fiches") or [P["fiche"]]
        dos = chemins[0].split("/")[1]
        res = collections.Counter()
        for x in RS:
            if x["commande"] == cid: res[x["article"]] += float(x["qte"])
        autres = collections.Counter()
        for x in RS:
            if x["commande"] != cid: autres[x["article"]] += float(x["qte"])
        wb = Workbook(); ws = wb.active; ws.title = "Accessoires"
        rouge, gras, fond = Font(color="C8102E", bold=True), Font(bold=True), PatternFill("solid", fgColor="E7F1FB")
        nom_aff = d.get("chantier") or cid
        ws.append([f"Accessoires à commander · {nom_aff} · commande atelier {cid} · {P.get('src', '')} · {datetime.date.today():%d/%m/%Y}"]); ws["A1"].font = Font(bold=True, size=13)
        ws.append([f"Réservation confirmée par {P.get('par') or 'Christophe'} le {P.get('d') or auj()}. Réf. entre parenthèses (en rouge) = absente du stock atelier. Quincailleries en pièces, joints en mètres."])
        ws.append([])
        ws.append(["Réf.", "Désignation", "Finition", "Unité", "Besoin", "Réservé pour l'affaire", "Emplacement", "À commander"])
        for c in ws[4]: c.font = gras; c.fill = fond
        n_cmd = n_abs = 0
        for b in d.get("besoins") or []:
            if not str(b.get("src", "")).startswith("fiche "): continue
            CA = idx.get(norm(b["ref"]), [])
            rv = sum(res[a["id"]] for a in CA)
            dispo_ailleurs = sum(max(0, N.get(a["id"], 0) - res[a["id"]] - autres[a["id"]]) for a in CA)
            cmd = max(0, b["q"] - rv)
            if cmd <= 0: continue
            absent = not CA or (rv <= 0 and dispo_ailleurs <= 0 and all(N.get(a["id"], 0) <= 0 for a in CA))
            ws.append([f"({b['ref']})" if absent else b["ref"], b.get("des", ""), b.get("fin", ""), "m" if "(en m)" in b.get("des", "") else "pce", b["q"], rv or "",
                       ", ".join(sorted({a["emplacement"] for a in CA if a.get("emplacement")})), cmd])
            ws.cell(ws.max_row, 8).font = rouge; n_cmd += 1
            if absent: ws.cell(ws.max_row, 1).font = rouge; n_abs += 1
        ws.append([]); ws.append([f"{n_cmd} références à commander, dont {n_abs} absentes du stock."]); ws.cell(ws.max_row, 1).font = gras
        for w, cols in ((ws, [14, 42, 12, 7, 10, 20, 14, 14]),):
            for i, cw in enumerate(cols, 1): w.column_dimensions[get_column_letter(i)].width = cw
        ws.freeze_panes = "A5"
        fichier = f"Accessoires a commander - {sans_accents(nom_aff)} - {auj()}.xlsx"
        chemin = f"vers-serveur/{dos}/ATELIER/{fichier}"
        b = io.BytesIO(); wb.save(b)
        req("POST", "/storage/v1/object/documents/" + q(chemin), b.getvalue(),
            {"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "x-upsert": "true"})
        maj(cid, {"propClaude": {**P, "excel": f"ATELIER/{fichier}", "excelLe": auj()}})
        print(f"{cid} : {fichier} déposé ({n_cmd} à commander, dont {n_abs} absentes) ; recopié sur le serveur au prochain passage du Mac")


if __name__ == "__main__":
    {"lire": lire, "excel": excel}[sys.argv[1]]()
