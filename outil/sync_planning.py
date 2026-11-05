#!/usr/bin/env python3
"""Recopie le planning Excel de Marine (PLANNING_2026.xlsx, réunion du jeudi) dans la table planning de l'appli.

Usage : python3 -I sync_planning.py "<chemin du .xlsx ou .csv>" [--depuis AAAA-MM-JJ] [--essai] [--export FICHIER.csv]
- Lit les onglets d'années (2026, 2027…) : colonnes « ÉQUIPE 1 », « ÉQUIPE 2 », « ÉQUIPE 3 » repérées par leur en-tête.
- Chaque case non vide devient une ligne par personne de l'équipe ; si le texte correspond à un chantier de l'appli,
  la ligne est rattachée au chantier (fiches visibles), sinon le texte est gardé tel quel (libellé).
- Remplace, à partir de --depuis (aujourd'hui par défaut), toutes les lignes source='excel' (les ajouts faits à la main
  dans l'appli sont conservés). L'Excel fait foi (consigne de Steven du 03/11/2026).
Accès : l'hôte Supabase est authentifié par le proxy de l'environnement « MGDS Supabase ».

En deux étapes (une tâche planifiée ne peut pas avoir à la fois le Mac et l'environnement « MGDS Supabase ») :
1) sur le Mac : python3 -I sync_planning.py "<chemin du .xlsx>" --export planning.csv [--depuis AAAA-MM-JJ]
   lit l'Excel et écrit un CSV séparé par « ; » (en-tête jour;equipe;texte, jour en AAAA-MM-JJ),
   puis s'arrête SANS aucun appel réseau ;
2) dans l'environnement « MGDS Supabase » : python3 -I sync_planning.py planning.csv [--depuis AAAA-MM-JJ] [--essai]
   un fichier d'entrée en .csv remplace l'Excel (filtre --depuis appliqué), la suite est identique.
"""
import csv, datetime, json, re, sys, unicodedata, urllib.request
import openpyxl

URL = "https://azgvzgenfykvlkuwevty.supabase.co/rest/v1"
H = {"apikey": "x", "Authorization": "Bearer x", "Content-Type": "application/json"}
EQUIPES = {  # e-mails des comptes
    "1": ["allan.poseur@mgds.fr", "jordi.poseur@mgds.fr"],
    "2": ["yannis.poseur@mgds.fr", "yousef.poseur@mgds.fr"],
    # équipe 3 (Minimaliste) : Yannick ou Steven avec l'équipe 2
    "3": ["travaux@mgds.fr", "s.gallais@mgds.fr", "yannis.poseur@mgds.fr", "yousef.poseur@mgds.fr"],
}
MOIS = {"JANV": 1, "FEV": 2, "MARS": 3, "AVR": 4, "MAI": 5, "JUIN": 6, "JUIL": 7, "AOUT": 8, "SEPT": 9, "OCT": 10, "NOV": 11, "DEC": 12}
# mots trop généraux pour reconnaître un chantier
VIDES = {"CONSTRUCTION", "VILLE", "ORLEANS", "IMMOBILIER", "VILLAGE", "ENTREPRISE", "PORTE", "ENTREE", "SAFETY", "LOFTS", "GLOBALE", "SYSTEM"}
# correspondances fixes : texte Excel -> n° de chantier dans l'appli
FIXES = {"CHEVRE QUI DANSE": "SMBL-CHEVRE", "HOURY": "SCI-HOURY"}


def plain(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s.replace("\x9f", " ")).strip().upper()


def req(method, path, body=None, extra=None):
    r = urllib.request.Request(URL + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={**H, **(extra or {})})
    with urllib.request.urlopen(r) as x:
        t = x.read()
        return json.loads(t) if t else None


def mots_cles(chantiers):
    keys = []
    for c in chantiers:
        for w in re.findall(r"[A-Z]{4,}", plain(c["client"])):
            if w not in VIDES:
                keys.append((w, c["id"]))
    for k, v in FIXES.items():
        keys.append((k, v))
    return sorted(keys, key=lambda kv: -len(kv[0]))


def lire(xlsx, depuis):
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    out = []
    for ws in wb.worksheets:
        if not re.fullmatch(r"20\d\d", ws.title.strip()):
            continue
        an = int(ws.title)
        head = [plain(v) for v in next(ws.iter_rows(min_row=1, max_row=1, values_only=True))]
        cols = {}
        for i, h in enumerate(head):
            m = re.match(r"EQUIPE ([123])\b", h)
            if m:
                cols[m.group(1)] = i
        try:
            ij = head.index("JOUR") + 1  # numéro du jour juste après le nom du jour
        except ValueError:
            continue
        mois = cur = None
        for r in ws.iter_rows(min_row=2, values_only=True):
            a = plain(r[0])
            if a:
                mois = next((n for k, n in MOIS.items() if a.startswith(k)), mois)
                if re.search(r"\b\d\d\b", a) and not a.startswith(str(an)):  # « JANV. 27 » : l'année suivante
                    break
            d = r[ij] if ij < len(r) else None
            if isinstance(d, (int, float)) and mois:
                m = mois
                # fin du mois précédent écrite sous l'étiquette du nouveau mois
                if cur and d > 20 and m > cur.month and cur.day < d:
                    m = cur.month
                try:
                    cur = datetime.date(an, m, int(d))
                except ValueError:
                    continue
            if not cur or cur < depuis:
                continue
            for eq, i in cols.items():
                t = str(r[i] or "").replace("\x9f", "").strip() if i < len(r) else ""
                if t:
                    out.append((cur, eq, t))
    return out


def lire_csv(fichier, depuis):
    out = []
    with open(fichier, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter=";"):
            jour = datetime.date.fromisoformat(r["jour"])
            if jour >= depuis:
                out.append((jour, r["equipe"], r["texte"]))
    return out


def exporter(lignes, fichier):
    with open(fichier, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["jour", "equipe", "texte"])
        for jour, eq, t in lignes:
            w.writerow([jour.isoformat(), eq, t])
    print(f"{len(lignes)} cases exportées dans {fichier}")


def main():
    args = sys.argv[1:]
    xlsx = args[0]
    depuis = datetime.date.today()
    if "--depuis" in args:
        depuis = datetime.date.fromisoformat(args[args.index("--depuis") + 1])
    essai = "--essai" in args
    if "--export" in args:  # étape 1 : Excel -> CSV, sans réseau
        exporter(lire(xlsx, depuis), args[args.index("--export") + 1])
        return
    entree = lire_csv(xlsx, depuis) if xlsx.lower().endswith(".csv") else lire(xlsx, depuis)
    profils = {p["email"]: p["id"] for p in req("GET", "/profils?select=id,email")}
    chantiers = req("GET", "/chantiers?select=id,client:data->>client")
    keys = mots_cles(chantiers)
    rows, libres = [], {}
    for jour, eq, t in entree:
        p = plain(t)
        cid = next((v for k, v in keys if re.search(r"\b" + re.escape(k) + r"\b", p)), None)
        note = "À l'atelier" if p.startswith("ATELIER") and cid else None
        if not cid:
            libres.setdefault(t, 0)
            libres[t] += 1
        for e in EQUIPES[eq]:
            if e in profils:
                rows.append({"jour": jour.isoformat(), "chantier": cid, "libelle": None if cid else t, "poseur": profils[e],
                             "note": note, "equipe": eq, "source": "excel"})
    # pas de doublon (même jour, même personne, même chantier) : l'unicité de la base l'interdirait
    vus, uniq = set(), []
    for r in rows:
        k = (r["jour"], r["poseur"], r["chantier"] or "~" + r["libelle"])
        if k not in vus:
            vus.add(k)
            uniq.append(r)
    print(f"{len(uniq)} lignes à partir du {depuis:%d/%m/%Y} ; rattachées à un chantier : {sum(1 for r in uniq if r['chantier'])}")
    print("Textes sans chantier dans l'appli :", ", ".join(sorted(libres)))
    if essai:
        return
    req("DELETE", f"/planning?source=eq.excel&jour=gte.{depuis.isoformat()}", extra={"Prefer": "return=minimal"})
    if uniq:
        req("POST", "/planning", uniq, {"Prefer": "return=minimal"})
    print("Planning de l'appli mis à jour.")


if __name__ == "__main__":
    main()
