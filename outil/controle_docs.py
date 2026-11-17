"""Contrôle des documents des chantiers par Claude (consigne de Steven du 16/11/2026 : « contrôler à chaque fois les
nouvelles fiches, devis, ARC, plans… »). Outil de la tâche planifiée « Contrôle des documents des chantiers ».

  python3 -I controle_docs.py liste                         documents pas encore contrôlés (traite = false) et chantiers sans fiches
  python3 -I controle_docs.py telecharge <chantier> <doc_id> <dossier>     copie locale d'un document
  python3 -I controle_docs.py note <chantier> '<json>'      complète la fiche du chantier ; "controles" s'AJOUTE aux points relevés
  python3 -I controle_docs.py traite <chantier> <doc_id> [...]             marque des documents comme contrôlés
  python3 -I controle_docs.py modeles <dossier>             télécharge les modèles de fiches et les générateurs
  python3 -I controle_docs.py champs <pdf>                  liste les champs d'une fiche (pour la pré-remplir)
  python3 -I controle_docs.py remplir <pdf> '<json>' <sortie.pdf>          remplit des champs texte d'une fiche
  python3 -I controle_docs.py ajoute <chantier> <type> <pdf> "<nom affiché>"  ajoute une fiche au chantier (Préparation, Métré, Support, Réception)

Les écritures passent par le compteur de version (comme l'appli). Rien n'est jamais supprimé. Aucun prix n'est lu.
"""
import datetime, json, os, sys, urllib.parse, urllib.request, uuid

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x"}  # l'hôte est authentifié par le proxy de l'environnement
FICHES = ("Préparation", "Métré", "Support", "Réception")
MODELES = {  # modèles vierges (en-tête client à remplacer) et générateurs, dans le stockage « outil »
    "modeles/preparation.pdf", "modeles/reception.pdf", "modeles/metre.pdf", "modeles/support-mancosu.pdf",
    "generateurs/support_rs.py", "generateurs/metre_devis.py", "generateurs/ajout_etancheite.py", "generateurs/apparences.py"}


def req(method, path, body=None, extra=None, raw=False):
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    h = {**H, **(extra or {})}
    if body is not None and not isinstance(body, bytes): h["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=h, method=method)) as r:
        b = r.read()
        return b if raw else (json.loads(b) if b else None)


def q(p): return urllib.parse.quote(p)
def auj(): return datetime.date.today().isoformat()


def chantier(cid):
    r = req("GET", f"/rest/v1/chantiers?select=data,version&id=eq.{q(cid)}")
    if not r: raise SystemExit(f"chantier {cid} introuvable")
    return r[0]


def ecrit(cid, f):
    """f(data) -> data modifiée ; réessaie si quelqu'un a écrit entre-temps."""
    for _ in range(6):
        r = chantier(cid); d = f(dict(r["data"]))
        u = req("PATCH", f"/rest/v1/chantiers?id=eq.{q(cid)}&version=eq.{r['version']}", {"data": d}, {"Prefer": "return=representation"})
        if u: return u[0]["data"]
    raise SystemExit(f"{cid} : écriture impossible (conflit)")


def liste():
    R = req("GET", "/rest/v1/chantiers?select=id,data&order=id")
    for r in R:
        d = r["data"]; docs = d.get("docs") or []
        neufs = [x for x in docs if not x.get("traite")]
        sans = not any(x.get("type") in FICHES for x in docs)
        if not neufs and not sans: continue
        print(f"== {r['id']} · {d.get('client', '')} · type {d.get('type') or '?'} · commercial {d.get('commercial') or '?'}"
              + (" · SANS FICHES" if sans else ""))
        for x in neufs:
            print(f"   à contrôler : {x.get('type')} | {x.get('name')} | {x.get('at')} | {x['id']}" + (" | REMPLIE" if x.get("rempli") else ""))
        if sans:
            for x in docs:
                if x.get("type") == "Devis": print(f"   devis : {x.get('name')} | {x['id']}")


def telecharge(cid, did, dossier):
    os.makedirs(dossier, exist_ok=True)
    x = next((x for x in chantier(cid)["data"].get("docs") or [] if x["id"] == did), None)
    if not x: raise SystemExit("document introuvable")
    p = os.path.join(dossier, os.path.basename(did))
    open(p, "wb").write(req("GET", "/storage/v1/object/documents/" + q(did), raw=True)); print(p)


def note(cid, patch):
    patch = json.loads(patch)
    nouv = patch.pop("controles", [])
    def f(d):
        d.update(patch)
        c = list(d.get("controles") or [])
        for x in nouv:
            x = x if isinstance(x, dict) else {"texte": str(x), "niveau": "info"}
            if x["texte"] not in [y.get("texte") for y in c]: c.append(x)
        d["controles"] = c; return d
    ecrit(cid, f); print(f"{cid} : {len(patch)} champ(s), {len(nouv)} point(s) relevé(s)")


def traite(cid, ids):
    def f(d):
        d["docs"] = [{**x, "traite": True} if x["id"] in ids else x for x in d.get("docs") or []]; return d
    ecrit(cid, f); print(f"{cid} : {len(ids)} document(s) contrôlé(s)")


def modeles(dossier):
    for m in sorted(MODELES):
        p = os.path.join(dossier, m); os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "wb").write(req("GET", "/storage/v1/object/outil/" + q(m), raw=True)); print(p)


def champs(pdf):
    from pypdf import PdfReader
    for k, v in (PdfReader(pdf).get_fields() or {}).items():
        print(k, "=", str(v.get("/V") or ""))


def remplir(pdf, vals, sortie):
    from pypdf import PdfWriter
    vals = json.loads(vals); w = PdfWriter(clone_from=pdf)
    for p in w.pages: w.update_page_form_field_values(p, vals, auto_regenerate=False)
    w.write(sortie); print(sortie)


def ajoute(cid, typ, pdf, nom):
    if typ not in FICHES: raise SystemExit("type : " + ", ".join(FICHES))
    b = open(pdf, "rb").read(); k = f"app/{uuid.uuid4()}-{os.path.basename(pdf)}"
    req("POST", "/storage/v1/object/documents/" + q(k), b, {"Content-Type": "application/pdf"})
    def f(d):
        d["docs"] = list(d.get("docs") or []) + [{"at": auj(), "by": "", "id": k, "name": nom, "size": len(b), "type": typ, "traite": True}]; return d
    ecrit(cid, f); print(f"{cid} : {typ} ajoutée ({nom})")


if __name__ == "__main__":
    a = sys.argv[1:]
    {"liste": lambda: liste(), "telecharge": lambda: telecharge(*a[1:4]), "note": lambda: note(a[1], a[2]),
     "traite": lambda: traite(a[1], a[2:]), "modeles": lambda: modeles(a[1]), "champs": lambda: champs(a[1]),
     "remplir": lambda: remplir(a[1], a[2], a[3]), "ajoute": lambda: ajoute(a[1], a[2], a[3], a[4])}[a[0]]()
