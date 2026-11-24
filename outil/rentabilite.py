"""Rentabilité par chantier (Direction, Steven seul) : lit le total HT des devis signés et des ARC de l'appli
et les range dans la table direction (vente_<chantier>, achat_<chantier>, atl_<commande atelier>). Règle de Steven du 17/11/2026 : les prix
ne sont lus que pour la page Direction ; rien n'est écrit ailleurs (ni chantier, ni serveur, ni mémoire).

  python3 -I rentabilite.py essai    montre ce qui serait écrit
  python3 -I rentabilite.py          écrit (une valeur saisie à la main dans Direction n'est jamais écrasée)
"""
import datetime, json, re, sys, urllib.parse, urllib.request
import pymupdf

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x"}  # l'hôte est authentifié par le proxy de l'environnement


def req(method, path, body=None, extra=None, raw=False):
    data = None if body is None else json.dumps(body).encode()
    h = {**H, **(extra or {})}
    if body is not None: h["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=h, method=method)) as r:
        b = r.read()
        return b if raw else (json.loads(b) if b else None)


def texte(doc_id):
    b = req("GET", "/storage/v1/object/documents/" + urllib.parse.quote(doc_id), raw=True)
    d = pymupdf.open(stream=b, filetype="pdf")
    return "\n".join(p.get_text() for p in d).replace("\xa0", " ")


def nombre(s):
    s = s.replace(" ", "").replace(" ", "").replace("€", "")
    if "," in s: s = s.replace(".", "").replace(",", ".")
    return float(s)


NUM = r"(-?\d{1,3}(?:[ . ]?\d{3})*(?:,\d{2})|\d+\.\d{2})"


def total_devis(t):
    """« Total HT : » du récapitulatif (le dernier : celui de la fin du devis)"""
    v = re.findall(r"Total HT\s*:\s*\n?\s*" + NUM, t)
    return nombre(v[-1]) if v else None


def total_arc(t):
    v = re.findall(r"TOTAL NET HT\s*(?:\(?EUR\)?|€)?\s*:?\s*\n?\s*" + NUM, t, re.I) or \
        re.findall(r"(?:Total|Montant) H\.?T\.?(?: net)?\s*(?:\(?EUR\)?|€)?\s*:?\s*\n?\s*" + NUM, t, re.I)
    if v: return nombre(v[-1])
    # mise en page en colonnes (ARC Bel'M / CETIH) : « Mt H.T. Net », puis plus bas la liste des montants
    m = re.search(r"(?:Mt|Montant)\s*H\.?\s*T\.?\s*Net", t, re.I)
    if m:
        v = re.findall(NUM, t[m.end():m.end() + 400])
        if v: return nombre(v[0])
    return None


def num_devis(nom):
    m = re.search(r"D\d{9}", nom or "")
    return m.group(0) if m else None


def ls(prefix):
    return [{**x, "chemin": prefix + x["name"]} for x in req("POST", "/storage/v1/object/list/documents", {"prefix": prefix, "limit": 1000}) or []]


def devis_atelier(a, liens):
    """devis client de Christophe le plus récent (comme arc_atelier.py) : ATELIER/DEVIS CLIENT du serveur, sinon document « Devis client »"""
    d = a["data"]; cand = []
    c = (liens.get(d.get("chantier") or "") or {})
    dos = c.get("chemin") or c.get("dossier") or ""
    if dos:
        try:
            for x in ls(f"serveur/{dos}/ATELIER/DEVIS CLIENT/"):
                if x["name"].lower().endswith(".pdf"): cand.append((x.get("updated_at") or "", x["chemin"], x["name"]))
        except Exception: pass
    for doc in d.get("docs") or []:
        if doc.get("type") == "Devis client": cand.append((doc.get("at") or "", doc["id"], doc.get("name") or doc["id"]))
    return sorted(cand)[-1] if cand else None


def atelier(direction, essai, le):
    """Rentabilité séparée pose / atelier (Steven, 24/11/2026) : prix de vente de l'atelier = total HT du devis client de
    Christophe (ce que l'atelier « vend » au chantier). Rangé dans direction/atl_<commande> ; une saisie à la main n'est jamais écrasée."""
    try: liens = (json.loads(req("GET", "/storage/v1/object/documents/serveur/_liens.json", raw=True)) or {}).get("chantiers") or {}
    except Exception: liens = {}
    for a in req("GET", "/rest/v1/atelier?select=id,data"):
        d = a["data"]
        if not d.get("chantier"): continue
        s = devis_atelier(a, liens)
        if not s: continue
        try:
            t = texte(s[1]); m = re.findall(r"Total HT\s*:?\s*\n?\s*([\d\s.,]+)\s*€", t); v = nombre(m[-1].strip()) if m else None
        except Exception: v = None
        print(f"atelier {a['id']:<10} {d.get('chantier'):<14} devis client {s[2]} : {'illisible' if v is None else f'{v:,.2f}'}")
        old = direction.get("atl_" + a["id"]) or {}
        if essai or v is None or old.get("man"): continue
        req("POST", "/rest/v1/direction", {"id": "atl_" + a["id"], "data": {"kind": "atelier", "chantier": d["chantier"], "ht": round(v, 2), "doc": s[2], "le": le}},
            {"Prefer": "resolution=merge-duplicates"})


def main(essai):
    direction = {r["id"]: r["data"] for r in req("GET", "/rest/v1/direction?select=id,data")}
    le = datetime.date.today().isoformat()
    illis = []   # devis signés scannés (illisibles) : tâche pour Marine (consigne de Steven du 23/11/2026), sans aucun montant
    for r in req("GET", "/rest/v1/chantiers?select=id,data&order=id"):
        docs = r["data"].get("docs") or []
        # devis : un par numéro (la dernière version déposée), additionnés
        par_num = {}
        for d in docs:
            if d.get("type") == "Devis": par_num[num_devis(d.get("name")) or d["id"]] = d
        vente, srcs, rates = 0.0, [], []
        for k, d in par_num.items():
            try: v = total_devis(texte(d["id"]))
            except Exception as e: v = None
            if v is None: rates.append(d.get("name") or k)
            else: vente += v; srcs.append({"doc": d.get("name") or k, "ht": round(v, 2)})
        arcs = []
        for d in docs:
            if d.get("type") != "ARC": continue
            try: v = total_arc(texte(d["id"]))
            except Exception: v = None
            arcs.append({"doc": d.get("name") or d["id"], "ht": None if v is None else round(v, 2)})
        print(f"{r['id']:<22} vente {vente:>12,.2f}  ({len(srcs)} devis{', illisible : ' + ', '.join(rates) if rates else ''})"
              f"  ARC {sum(a['ht'] or 0 for a in arcs):>11,.2f} ({len(arcs)})")
        old = direction.get("vente_" + r["id"]) or {}
        if rates and not srcs and not old.get("man"):   # un devis lisible existe déjà : la copie signée scannée ne bloque pas
            illis.append({"chantier": r["id"], "client": r["data"].get("client", ""), "fichiers": rates, "partiel": bool(srcs)})
        if essai: continue
        if srcs and not old.get("man"):
            req("POST", "/rest/v1/direction", {"id": "vente_" + r["id"], "data": {"kind": "vente", "ht": round(vente, 2), "devis": srcs, "illisibles": rates, "le": le}},
                {"Prefer": "resolution=merge-duplicates"})
        if arcs:
            req("POST", "/rest/v1/direction", {"id": "achat_" + r["id"], "data": {"kind": "arcs", "arcs": arcs, "le": le}},
                {"Prefer": "resolution=merge-duplicates"})


    atelier(direction, essai, le)
    print(len(illis), "chantier(s) avec un devis signé scanné")
    if not essai:
        # liste lue par l'appli (« À faire – Marine ») : reglages devis_illisibles, réécrite à chaque passage
        req("POST", "/rest/v1/reglages", {"id": "devis_illisibles", "data": {"le": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "items": illis}},
            {"Prefer": "resolution=merge-duplicates"})


if __name__ == "__main__":
    main(len(sys.argv) > 1 and sys.argv[1] == "essai")
