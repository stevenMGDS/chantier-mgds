#!/usr/bin/env python3
"""Recopie le planning Excel de Marine (PLANNING_2026.xlsx, réunion du jeudi) dans la table planning de l'appli.

Usage : python3 -I sync_planning.py "<chemin du .xlsx ou .csv>" [--depuis AAAA-MM-JJ] [--essai] [--export FICHIER.csv]
- Lit les onglets d'années (2026, 2027…) : colonnes « ÉQUIPE 1 », « ÉQUIPE 2 », « ÉQUIPE 3 » repérées par leur en-tête.
- Chaque case non vide devient une ligne par personne de l'équipe, rattachée à un chantier de l'appli (fiches visibles) :
  d'abord par le n° de devis « D » + 9 chiffres écrit dans la case (ex. « D260201722 HOURY ») : chantier dont l'id est ce n°,
  sinon chantier unique dont les données contiennent ce n° ; à défaut, par le nom du client. Sans chantier trouvé,
  le texte est gardé tel quel (libellé). Les n° de devis inconnus de l'appli sont listés dans le résumé.
- Case d'équipe sur fond orange dans l'Excel = journée à l'atelier : note « À l'atelier », chantier inchangé
  (comme un texte « ATELIER - … », reconnu même précédé d'un n° de devis).
- Remplace, à partir de --depuis (aujourd'hui par défaut), toutes les lignes source='excel' (les ajouts faits à la main
  dans l'appli sont conservés). L'Excel fait foi (consigne de Steven du 03/11/2026).
Accès : l'hôte Supabase est authentifié par le proxy de l'environnement « MGDS Supabase ».

En deux étapes (une tâche planifiée ne peut pas avoir à la fois le Mac et l'environnement « MGDS Supabase ») :
1) sur le Mac : python3 -I sync_planning.py "<chemin du .xlsx>" --export planning.csv [--depuis AAAA-MM-JJ]
   lit l'Excel et écrit un CSV séparé par « ; » (en-tête jour;equipe;texte;atelier, jour en AAAA-MM-JJ,
   atelier = 1 si la case est sur fond orange, vide sinon ; un ancien CSV sans colonne atelier reste accepté),
   puis s'arrête SANS aucun appel réseau ;
2) dans l'environnement « MGDS Supabase » : python3 -I sync_planning.py planning.csv [--depuis AAAA-MM-JJ] [--essai]
   un fichier d'entrée en .csv remplace l'Excel (filtre --depuis appliqué), la suite est identique.
"""
import colorsys, csv, datetime, json, re, sys, unicodedata, urllib.request
import xml.etree.ElementTree as ET
import openpyxl
from openpyxl.styles.colors import COLOR_INDEX

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
DEVIS = re.compile(r"\bD ?(\d{9})(?!\d)")  # n° de devis : « D260201722 » ou « D 260201722 »
ATELIER = "À l'atelier"


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


def theme_couleurs(wb):
    """Couleurs du thème Office (index Excel : 0 lt1, 1 dk1, 2 lt2, 3 dk2, 4-9 accent1-6, 10 hlink, 11 folHlink)."""
    try:
        root = ET.fromstring(wb.loaded_theme)
    except Exception:
        return []
    ns = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
    sch = root.find(f".//{ns}clrScheme")
    if sch is None:
        return []
    val = {}
    for el in sch:
        c = el[0] if len(el) else None
        if c is not None:
            val[el.tag.replace(ns, "")] = c.get("lastClr") or c.get("val")
    ordre = ["lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"]
    return [val.get(k) for k in ordre]


def couleur_rgb(col, theme):
    """(r, g, b) entre 0 et 1 d'une couleur openpyxl (RGB, thème avec nuance, ou indexée), ou None."""
    if col is None:
        return None
    hexa = None
    if col.type == "rgb" and isinstance(col.rgb, str):
        hexa = col.rgb
    elif col.type == "theme" and isinstance(col.theme, int) and col.theme < len(theme):
        hexa = theme[col.theme]
    elif col.type == "indexed" and isinstance(col.indexed, int) and col.indexed < len(COLOR_INDEX):
        hexa = COLOR_INDEX[col.indexed]
    if not hexa or not re.fullmatch(r"[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?", hexa):
        return None
    hexa = hexa[-6:]
    r, g, b = (int(hexa[i:i + 2], 16) / 255 for i in (0, 2, 4))
    tint = col.tint or 0
    if tint:  # nuance du thème : modifie la luminosité (règle Excel)
        h, l, s = colorsys.rgb_to_hls(r, g, b)
        l = l * (1 + tint) if tint < 0 else l * (1 - tint) + tint
        r, g, b = colorsys.hls_to_rgb(h, l, s)
    return r, g, b


def est_orange(cell, theme):
    f = cell.fill
    if f is None or not f.patternType or f.patternType == "none":
        return False
    rgb = couleur_rgb(f.fgColor, theme)
    if not rgb:
        return False
    h, l, s = colorsys.rgb_to_hls(*rgb)
    return 15 <= h * 360 <= 50 and s >= 0.2 and 0.1 <= l <= 0.95


def lire(xlsx, depuis):
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    theme = theme_couleurs(wb)
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
        for cells in ws.iter_rows(min_row=2):
            r = [c.value for c in cells]
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
                    out.append((cur, eq, t, est_orange(cells[i], theme)))
    return out


def lire_csv(fichier, depuis):
    out = []
    with open(fichier, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter=";"):
            jour = datetime.date.fromisoformat(r["jour"])
            if jour >= depuis:
                at = (r.get("atelier") or "").strip().lower() in ("1", "oui", "true", "x")  # colonne absente : ancien CSV
                out.append((jour, r["equipe"], r["texte"], at))
    return out


def exporter(lignes, fichier):
    with open(fichier, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["jour", "equipe", "texte", "atelier"])
        for jour, eq, t, at in lignes:
            w.writerow([jour.isoformat(), eq, t, "1" if at else ""])
    print(f"{len(lignes)} cases exportées dans {fichier} (dont {sum(1 for l in lignes if l[3])} sur fond orange = atelier)")


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
    chantiers = req("GET", "/chantiers?select=id,data")
    for c in chantiers:
        d = c.get("data") or {}
        c["client"] = d.get("client") if isinstance(d, dict) else None
        c["texte"] = re.sub(r"\s+", "", plain(json.dumps(d, ensure_ascii=False)))  # pour y chercher un n° de devis
    ids = {plain(c["id"]).replace(" ", ""): c["id"] for c in chantiers}
    keys = mots_cles(chantiers)

    def par_devis(num):  # num = « D » + 9 chiffres ; -> (id du chantier ou None, nb de chantiers trouvés)
        if num in ids:
            return ids[num], 1
        trouves = [c["id"] for c in chantiers if num in c["texte"]]
        return (trouves[0] if len(trouves) == 1 else None), len(trouves)

    rows, libres, inconnus, ambigus = [], {}, set(), set()
    for jour, eq, t, orange in entree:
        p = plain(t)
        cid = None
        for m in DEVIS.finditer(p):
            num = "D" + m.group(1)
            cid, n = par_devis(num)
            if cid:
                break
            (ambigus if n > 1 else inconnus).add(num)
        if not cid:
            cid = next((v for k, v in keys if re.search(r"\b" + re.escape(k) + r"\b", p)), None)
        sans_num = re.sub(r"^(D ?\d{9}\s*[-–:/]?\s*)+", "", p)  # « D260201722 ATELIER - … »
        note = ATELIER if orange or (sans_num.startswith("ATELIER") and cid) else None
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
    print(f"Lignes à l'atelier : {sum(1 for r in uniq if r['note'] == ATELIER)}")
    if inconnus:
        print("N° de devis inconnus de l'appli :", ", ".join(sorted(inconnus)))
    if ambigus:
        print("N° de devis présents dans plusieurs chantiers (rattachement par le nom) :", ", ".join(sorted(ambigus)))
    if essai:
        return
    req("DELETE", f"/planning?source=eq.excel&jour=gte.{depuis.isoformat()}", extra={"Prefer": "return=minimal"})
    if uniq:
        req("POST", "/planning", uniq, {"Prefer": "return=minimal"})
    print("Planning de l'appli mis à jour.")


if __name__ == "__main__":
    main()
