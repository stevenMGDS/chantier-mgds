"""ARC de l'atelier (fabrication Technal MGDS), consigne de Steven du 24/11/2026.

Source : le DEVIS CLIENT de Christophe (le devis de vente de l'atelier, pas les devis de vitrages ni les ARC Technal) :
  - stockage documents/serveur/<dossier>/ATELIER/DEVIS CLIENT/*.pdf (recopié par l'iMac), le plus récent ;
  - ou, en attendant, un document de la commande atelier de type « Devis client » déposé dans l'appli.
Résultat : « ARC atelier <AT…> - <chantier> v<n>.pdf » déposé dans documents/vers-serveur/<dossier>/FOURNISSEURS/ARC/
(l'iMac le recopie sur le serveur) et noté dans la commande atelier. Yannick le contrôle, le corrige si besoin et le range
dans FOURNISSEURS/ARC/ARC VALIDE : la synchro le ramène alors dans la fiche du chantier, et `integre` coche « ARC validé »
dans la commande atelier.

Règles de Steven : jamais d'heures d'atelier. Chantier MGDS (dest mgds) : aucun prix. Client extérieur (dest revente ou annexe) :
seulement le prix total HT et le délai. Le planning vient de la commande atelier (calculé par l'appli, à confirmer par Christophe).

  python3 -I arc_atelier.py liste              commandes atelier qui ont un devis client sans ARC à jour
  python3 -I arc_atelier.py genere <AT> [pdf]  lit le devis client (ou le PDF local donné) et dépose l'ARC
  python3 -I arc_atelier.py integre            ARC atelier rangé dans ARC VALIDE et revenu dans l'appli -> « ARC validé »
Il faut pymupdf et reportlab (pip install pymupdf reportlab).
"""
import datetime, io, json, re, sys, unicodedata, urllib.parse, urllib.request

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x"}  # l'hôte est authentifié par le proxy de l'environnement
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


def req(method, path, body=None, extra=None, raw=False):
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    h = {**H, **(extra or {})}
    if body is not None and not isinstance(body, bytes): h["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=h, method=method)) as r:
        b = r.read()
        return b if raw else (json.loads(b) if b else None)


def q(p): return urllib.parse.quote(p)
def sans_accents(s): return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
def auj(): return datetime.date.today().isoformat()


def ls(prefix):
    out = []
    for x in req("POST", "/storage/v1/object/list/documents", {"prefix": prefix, "limit": 1000}) or []:
        out.append({**x, "chemin": prefix + x["name"]})
    return out


# ---------- lecture du devis client de Christophe ----------
JUNK = re.compile(r"^(Désignation|Qté|Prix Unit\.?|Total|Vue INTérieure|Vue EXTérieure|\d+ / \d+|K/\S+ - .*)$")
PRODUIT = re.compile(r"(Porte|Fenêtre|Châssis|Chassis|Coulissant|Galandage|Ensemble|Volet|Baie|Imposte|Oscillo)", re.I)


def lire_devis(octets):
    import pymupdf
    doc = pymupdf.open(stream=octets, filetype="pdf")
    L = [l.strip() for p in doc for l in p.get_text().splitlines()]
    L = [l for l in L if l]
    ancres = [i for i, l in enumerate(L) if l.startswith("Ligne étude")]
    lignes, debut = [], None
    # début du premier bloc : après l'en-tête « Désignation Qté Prix Unit. Total »
    for i, l in enumerate(L):
        if l == "Désignation": debut = i; break
    for n, a in enumerate(ancres):
        fin = ancres[n + 1] if n + 1 < len(ancres) else len(L)
        # désignation et notes : entre la fin du bloc précédent (ses prix) et l'ancre
        prec = debut if n == 0 else ancres[n - 1]
        k = a - 1
        while k > prec and not re.search(r"€$", L[k]): k -= 1
        tete = [l for l in L[k + 1:a] if not JUNK.match(l) and not re.search(r"€$", l)]
        des = next((l for l in tete if PRODUIT.search(l)), tete[0] if tete else "")
        notes = [l for l in tete if l != des]
        m = re.search(r"Affaire n°\s*(.+)$", L[a]); rep = (m.group(1) if m else "").strip()
        blk = L[a + 1:fin]
        def apres(lbl):
            for i, l in enumerate(blk):
                if l.startswith(lbl) and i + 1 < len(blk): return blk[i + 1]
            return ""
        larg = re.sub(r"\D", "", apres("Largeur")); haut = re.sub(r"\D", "", apres("Hauteur :") or apres("Hauteur"))
        ral = ""
        for i, l in enumerate(blk):
            if l.lower().startswith("ral "):
                ral = l + (" " + blk[i + 1] if i + 1 < len(blk) and blk[i + 1].startswith(("texturé", "satiné", "brillant", "mat")) else ""); break
        vit = next((l for l in blk if re.match(r"^(DV|TV|SV|Vitrage|Panneau)\b", l)), "")
        env = []
        for i, l in enumerate(blk):
            if l.startswith("Environnement"):
                env.append(l.replace("Environnement", "").strip()); j = i + 1
                while j < len(blk) and blk[j].startswith(","): env.append(blk[j].lstrip(", ").strip()); j += 1
                break
        # quantité : l'entier juste avant le premier prix « … € » après l'environnement
        qte = 1
        for i, l in enumerate(blk):
            if re.search(r"€$", l):
                if i > 0 and re.fullmatch(r"\d+", blk[i - 1]): qte = int(blk[i - 1])
                break
        if n + 1 == len(ancres) or True:
            pass
        lignes.append({"rep": rep, "des": des, "notes": notes, "l": larg, "h": haut, "q": qte, "ral": ral,
                       "vit": re.sub(r"\s*\bfict(i)?f\b", "", vit, flags=re.I).strip(), "env": ", ".join(e for e in env if e)})
    texte = "\n".join(L)
    m = re.search(r"Total HT\s*\n?\s*([\d\s.,]+)\s*€", texte); total = m.group(1).strip() if m else ""
    m = re.search(r"Délais?\s*:\s*([^\n]+)", texte); delai = m.group(1).strip() if m else ""
    m = re.search(r"Affaire (K/\S+)", texte); affaire = m.group(1) if m else ""
    m = re.search(r"Orléans, (\d{2}/\d{2}/\d{4})", texte); date = m.group(1) if m else ""
    m = re.search(r"^Gamme (.+)$", texte, re.M); gamme = m.group(1) if m else ""
    m = re.search(r"^Thermolaquage (.+)$", texte, re.M); laquage = m.group(1) if m else ""
    return {"lignes": lignes, "total": total, "delai": delai, "affaire": affaire, "date": date, "gamme": gamme, "laquage": laquage}


# ---------- commandes atelier, dossiers, planning ----------
def commandes(): return {r["id"]: r for r in req("GET", "/rest/v1/atelier?select=id,data,version")}


def dossier_de(chantier):
    try: L = json.loads(req("GET", "/storage/v1/object/documents/serveur/_liens.json", raw=True))
    except Exception: return ""
    c = (L.get("chantiers") or {}).get(chantier) or {}
    return c.get("chemin") or c.get("dossier") or ""


def devis_client(cid, a):
    """le devis client le plus récent : dossier ATELIER/DEVIS CLIENT du serveur, sinon document « Devis client » de l'appli"""
    d = a["data"]; cand = []
    dos = dossier_de(d.get("chantier")) if d.get("chantier") else ""
    if dos:
        for x in ls(f"serveur/{dos}/ATELIER/DEVIS CLIENT/"):
            if x["name"].lower().endswith(".pdf"): cand.append((x.get("updated_at") or "", x["chemin"], x["name"]))
    for doc in d.get("docs") or []:
        if doc.get("type") == "Devis client": cand.append((doc.get("at") or "", doc["id"], doc.get("name") or doc["id"]))
    return sorted(cand)[-1] if cand else None


def semaine(iso):
    if not iso: return ""
    d = datetime.date.fromisoformat(iso[:10]); y, w, _ = d.isocalendar(); lun = d - datetime.timedelta(days=d.weekday())
    ven = lun + datetime.timedelta(days=4)
    return f"semaine {w} ({lun.day} {MOIS[lun.month-1]} au {ven.day} {MOIS[ven.month-1]} {ven.year})"


# ---------- PDF de l'ARC ----------
def pdf_arc(a, chantier, D, version, externe):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
    d = a["data"]; st = getSampleStyleSheet(); P = lambda t, s="BodyText": Paragraph(t, st[s])
    petit = ParagraphStyle("p", parent=st["BodyText"], fontSize=8, leading=10)
    titre = ParagraphStyle("t", parent=st["Title"], fontSize=17, textColor=colors.HexColor("#10407e"), alignment=0)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=14*mm, rightMargin=14*mm, topMargin=12*mm, bottomMargin=12*mm,
                            title=f"ARC atelier {a['id']}", author="MGDS atelier")
    calc = d.get("calc") or {}
    E = [Paragraph(f"Accusé de réception de commande – Atelier MGDS · {a['id']} v{version}", titre),
         P(f"<b>Affaire :</b> {chantier or d.get('client','')} · <b>Commande atelier :</b> {a['id']}"
           + (f" · <b>Devis atelier :</b> {D['affaire']} du {D['date']}" if D.get("affaire") else "")
           + f" · <b>Émis le :</b> {datetime.date.today():%d/%m/%Y}"),
         P(" · ".join(x for x in [D.get("gamme") and "Gamme " + D["gamme"], D.get("laquage") and "Thermolaquage " + D["laquage"],
                                     "Fabrication MGDS suivant prescriptions TECHNAL"] if x)),
         Spacer(1, 4)]
    plan = []
    if d.get("finManu") or calc.get("fin"): plan.append(f"<b>Fin de fabrication prévue :</b> {semaine(d.get('finManu') or calc.get('fin'))}")
    if calc.get("finSem"): plan.append(f"<b>Livraison prévue :</b> {semaine(calc['finSem'])}")
    if externe and D.get("delai"): plan.append(f"<b>Délai :</b> {D['delai']}")
    if plan: E += [P(" · ".join(plan)), P("<i>Planning calculé par l'appli Chantiers MGDS, à confirmer par Christophe.</i>", "BodyText"), Spacer(1, 4)]
    rows = [["Repère", "Désignation", "L (mm)", "H (mm)", "Qté", "Coloris", "Vitrage", "Environnement"]]
    for l in D["lignes"]:
        des = l["des"] + ("<br/><font size=7>" + " · ".join(l["notes"]) + "</font>" if l["notes"] else "")
        rows.append([Paragraph(l["rep"], petit), Paragraph(des, petit), l["l"], l["h"], str(l["q"]), Paragraph(l["ral"], petit),
                     Paragraph(l["vit"], petit), Paragraph(l["env"], petit)])
    t = Table(rows, colWidths=[22*mm, 78*mm, 17*mm, 17*mm, 11*mm, 50*mm, 34*mm, 40*mm], repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10407e")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                           ("FONTSIZE", (0, 0), (-1, -1), 8), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("GRID", (0, 0), (-1, -1), .3, colors.HexColor("#b8c2cf")), ("ALIGN", (2, 1), (4, -1), "RIGHT"),
                           ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eef3f9")])]))
    E += [t, Spacer(1, 6), P(f"<b>{sum(l['q'] for l in D['lignes'])} menuiseries</b> sur {len(D['lignes'])} lignes.")]
    if externe and D.get("total"): E.append(P(f"<b>Prix total HT : {D['total']} €</b>"))
    E += [Spacer(1, 6), P("<b>À contrôler par Yannick</b> (repères, cotes, quantités, sens et coloris) avant la fabrication. Corriger si besoin, "
                          "puis ranger ce document dans <b>FOURNISSEURS / ARC / ARC VALIDE</b> : l'appli coche alors « ARC validé ».", "BodyText")]
    doc.build(E)
    return buf.getvalue()


def maj(cid, patch):
    for _ in range(3):
        r = req("GET", f"/rest/v1/atelier?select=data,version&id=eq.{q(cid)}")[0]
        d = {**r["data"], **patch}
        res = req("PATCH", f"/rest/v1/atelier?id=eq.{q(cid)}&version=eq.{r['version']}", {"data": d}, {"Prefer": "return=representation"})
        if res: return True
    return False


def genere(cid, local=None):
    C = commandes(); a = C.get(cid)
    if not a: sys.exit("commande atelier introuvable : " + cid)
    d = a["data"]
    if local: octets, src = open(local, "rb").read(), local.split("/")[-1]
    else:
        s = devis_client(cid, a)
        if not s: sys.exit(f"{cid} : pas de devis client (dossier ATELIER/DEVIS CLIENT ou document « Devis client »)")
        octets, src = req("GET", "/storage/v1/object/documents/" + q(s[1]), raw=True), s[2]
    D = lire_devis(octets)
    if not D["lignes"]: sys.exit(f"{cid} : aucune menuiserie lue dans {src}")
    ch = req("GET", f"/rest/v1/chantiers?select=id,data&id=eq.{q(d.get('chantier') or '-')}")
    chantier = (ch[0]["data"].get("client") if ch else "") or d.get("client") or d.get("chantier") or cid
    externe = (d.get("dest") or "mgds") != "mgds"
    old = d.get("arcAtelier") or {}
    version = (old.get("v") or 0) + 1
    pdf = pdf_arc(a, chantier, D, version, externe)
    nom = f"ARC atelier {cid} - {sans_accents(chantier.split(' - ')[0]).strip()} v{version}.pdf"
    dos = dossier_de(d.get("chantier")) if d.get("chantier") else ""
    cible = f"vers-serveur/{dos}/FOURNISSEURS/ARC/{nom}" if dos else f"atelier/{cid}/{nom}"
    req("POST", "/storage/v1/object/documents/" + q(cible), pdf, {"Content-Type": "application/pdf", "x-upsert": "true"})
    copie = f"atelier/{cid}/{nom}"
    if copie != cible: req("POST", "/storage/v1/object/documents/" + q(copie), pdf, {"Content-Type": "application/pdf", "x-upsert": "true"})
    docs = [x for x in (d.get("docs") or []) if x.get("id") != copie] + [{"type": "ARC", "name": nom, "id": copie, "at": auj(), "by": "Claude"}]
    maj(cid, {"docs": docs, "arcAtelier": {"v": version, "le": auj(), "source": src, "fichier": nom, "serveur": bool(dos),
                                           "lignes": len(D["lignes"]), "menuiseries": sum(l["q"] for l in D["lignes"]), "statut": "a_controler"}})
    print(f"{cid} : {nom} ({len(D['lignes'])} lignes, {sum(l['q'] for l in D['lignes'])} menuiseries) "
          + (f"déposé pour le serveur dans {dos}/FOURNISSEURS/ARC/" if dos else "rangé dans l'appli (dossier serveur inconnu)"))
    return D


def liste():
    for cid, a in sorted(commandes().items()):
        d = a["data"]
        if d.get("fini") or (d.get("steps") or {}).get("livre"): continue
        s = devis_client(cid, a)
        if not s: continue
        old = d.get("arcAtelier") or {}
        if old.get("source") == s[2] and old.get("le", "") >= (s[0] or "")[:10]: continue
        print(f"{cid} | {d.get('chantier','')} | devis client : {s[2]} | ARC {'à refaire (nouveau devis)' if old else 'à créer'}")


def integre():
    """ARC atelier revenu dans l'appli depuis ARC VALIDE (document de type ARC du chantier) -> « ARC validé » dans l'atelier"""
    C = commandes()
    for r in req("GET", "/rest/v1/chantiers?select=id,data"):
        for doc in r["data"].get("docs") or []:
            m = re.search(r"ARC atelier (AT\d{2}-\d{3})", doc.get("name") or "")
            if not m or m.group(1) not in C: continue
            a = C[m.group(1)]; d = a["data"]; st = d.get("steps") or {}
            if (st.get("arc") or {}).get("d"): continue
            maj(a["id"], {"steps": {**st, "arc": {"d": doc.get("at") or auj(), "by": "serveur"}},
                          "arcAtelier": {**(d.get("arcAtelier") or {}), "statut": "valide", "valideLe": doc.get("at") or auj()}})
            print(f"{a['id']} : ARC atelier validé par Yannick (rangé dans ARC VALIDE) -> « ARC validé » coché")


if __name__ == "__main__":
    c = sys.argv[1]
    if c == "liste": liste()
    elif c == "genere": genere(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    elif c == "integre": integre()
