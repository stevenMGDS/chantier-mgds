"""ARC validés rangés sur le serveur -> lignes ARC des chantiers de l'appli (Steven, 25/11/2026).

Yannick voyait « ARC à faire valider » alors que les ARC étaient rangés comme validés sur le serveur :
  - certains chantiers rangent les ARC validés dans FOURNISSEURS/ARC/VALIDE (et non ARC VALIDE) : pas repris ;
  - un ARC validé repris dans l'appli comme document ne cochait pas sa ligne, et un chantier sans ligne restait « à valider » ;
  - un fichier nommé « … validé le … » posé directement dans FOURNISSEURS/ARC.
L'iMac recopie tout FOURNISSEURS/ARC dans le stockage documents (serveur/<dossier>/FOURNISSEURS/ARC/…). Ici :
  - ARC validé = fichier d'un sous-dossier dont le nom contient « VALID », ou dont le nom contient « valid » ;
    pas les devis MGDS (« Devis … ») ni les ARC atelier (« ARC atelier … », suivis par la commande atelier) ;
  - la ligne ARC dont la référence (ou ses chiffres) figure dans le nom du fichier est cochée « Validé » ;
  - un ARC validé sans ligne reçoit une ligne (fournisseur deviné d'après le nom, à corriger si besoin), cochée « Validé » ;
  - les étapes « ARC validé », « Livraison prévue », « Matériel livré » sont recalculées comme dans l'appli (arcSync).
Ne décoche rien, n'efface rien, ne touche ni aux prix ni au serveur.

  python3 -I arc_valide.py essai    montre ce qui serait fait
  python3 -I arc_valide.py          écrit
"""
import datetime, json, re, sys, urllib.parse, urllib.request

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x"}   # l'hôte est authentifié par le proxy de l'environnement


def req(method, path, body=None, extra=None, raw=False):
    data = None if body is None else json.dumps(body).encode()
    h = {**H, **(extra or {})}
    if body is not None: h["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=h, method=method)) as r:
        b = r.read()
        return b if raw else (json.loads(b) if b else None)


def ls_tout(prefix, prof=4):
    out = []
    for x in req("POST", "/storage/v1/object/list/documents", {"prefix": prefix, "limit": 1000}) or []:
        if x.get("id") is None and prof > 0: out += ls_tout(prefix + x["name"] + "/", prof - 1)
        elif x.get("id") is not None: out.append(prefix + x["name"])
    return out


N = lambda s: re.sub(r"[^A-Z0-9]", "", str(s or "").upper())
FOURS = [("K-Line", r"^K\d{6,}|K.?LINE"), ("Roma", r"ROMA"), ("Reveau", r"REVEAU"), ("Internorm", r"INTERNORM"), ("Technal", r"TECHNAL"),
         ("Bel'M", r"BEL.?M"), ("Hörmann", r"HORMANN|HÖRMANN|HOE\d"), ("Warema", r"WAREMA"), ("Somfy", r"SOMFY"), ("FAAC", r"FAAC"),
         ("Riou", r"RIOU"), ("Keller", r"KELLER"), ("Franciaflex", r"FRANCIAFLEX")]


def ref_de(nom):
    s = re.sub(r"\.pdf$", "", nom, flags=re.I)
    m = re.search(r"\bK\d{6,}\b", s) or re.search(r"[A-Z]{2,4}\d{0,4}[-_]?\d{4,}", s.upper()) or re.search(r"\d{5,}", s)
    return m.group(0) if m else s[:40]


def valide(chemin):
    sous = chemin.split("/FOURNISSEURS/ARC/", 1)[1]
    nom = sous.rsplit("/", 1)[-1]
    if not nom.lower().endswith(".pdf") or re.match(r"(devis|arc atelier)\b", nom, re.I): return False
    dossiers = sous.split("/")[:-1]
    return any("VALID" in d.upper() for d in dossiers) or "VALID" in nom.upper()


def recalcule(arcs):
    okd = lambda a: ((a.get("ok") or {}).get("d")) or ((a.get("sansArc") or {}).get("d")) or ""
    tous = lambda f: bool(arcs) and all(f(a) for a in arcs)
    mx = lambda xs: sorted(xs)[-1] if xs else ""
    return {"arc": {"d": mx([okd(a) for a in arcs]), "by": ""} if tous(okd) else None,
            "livprev": {"d": mx([a["prev"] for a in arcs]), "by": ""} if tous(lambda a: a.get("prev")) else None,
            "livre": {"d": mx([a["livre"]["d"] for a in arcs]), "by": ""} if tous(lambda a: (a.get("livre") or {}).get("d")) else None}


def main(essai):
    jour = datetime.date.today().isoformat()
    liens = (json.loads(req("GET", "/storage/v1/object/documents/serveur/_liens.json", raw=True)) or {}).get("chantiers") or {}
    for r in req("GET", "/rest/v1/chantiers?select=id,data&order=id"):
        cid, d = r["id"], r["data"]
        if ((d.get("steps") or {}).get("arc") or {}).get("d"): continue   # ARC déjà validés : rien à reprendre
        c = liens.get(cid) or {}; dos = c.get("chemin") or c.get("dossier") or ""
        fichiers = [x.rsplit("/", 1)[-1] for x in (ls_tout(f"serveur/{dos}/FOURNISSEURS/ARC/") if dos else []) if valide(x)]
        # ARC repris dans l'appli depuis ARC VALIDE (documents de type ARC)
        fichiers += [x.get("name") or "" for x in d.get("docs") or [] if x.get("type") == "ARC" and not re.match(r"(devis|arc atelier)\b", x.get("name") or "", re.I)]
        if not fichiers: continue
        arcs = [dict(a) for a in d.get("arcs") or []]
        faits, vus = [], set()
        for f in fichiers:
            nf, df = N(f), re.sub(r"\D", "", f)
            ligne = None
            for a in arcs:
                if a.get("aid"): continue
                ref = N(a.get("ref")); chiffres = re.sub(r"\D", "", a.get("ref") or "")
                if (len(ref) >= 4 and ref in nf) or (len(chiffres) >= 5 and chiffres in df): ligne = a; break
            cle = N(ref_de(f))
            if ligne is None:
                if cle in vus: continue
                four = next((n for n, p in FOURS if re.search(p, f.upper())), "")
                ligne = {"four": four or "Fournisseur ?", "ref": ref_de(f), "objet": "repris du serveur (ARC validé)", "lieu": "", "prev": "", "livre": None, "ok": None}
                arcs.append(ligne); faits.append(f"ligne ajoutée {ligne['four']} {ligne['ref']}")
            vus.add(cle)
            if not ((ligne.get("ok") or {}).get("d") or (ligne.get("sansArc") or {}).get("d")):
                ligne["ok"] = {"d": jour, "by": "serveur"}; faits.append(f"validé {ligne.get('four')} {ligne.get('ref')} ({f})")
        if not faits: continue
        print(cid, d.get("client", ""), "->", "; ".join(faits))
        if essai: continue
        frais = req("GET", "/rest/v1/chantiers?select=data&id=eq." + urllib.parse.quote(cid))[0]["data"]
        frais["arcs"] = arcs
        frais["steps"] = {**(frais.get("steps") or {}), **recalcule(arcs)}
        lieux = sorted({a.get("lieu") for a in arcs if a.get("lieu")})
        frais["livraison"] = "mixte" if len(lieux) > 1 else (lieux[0] if lieux else frais.get("livraison", ""))
        req("PATCH", "/rest/v1/chantiers?id=eq." + urllib.parse.quote(cid), {"data": frais}, {"Prefer": "return=minimal"})


if __name__ == "__main__":
    main(len(sys.argv) > 1 and sys.argv[1] == "essai")
