"""Plans d'exé -> menuiseries de la commande atelier (Steven, 25/11/2026).

Les repères et les cotes définitifs sont sur le plan d'exé dessiné par Steven (le devis peut avoir un autre repérage) :
une page par repère, avec un bloc de texte « ME016 - Chambre 3 : Baie coulissante… », puis « Coulissant Soléal 65 2 rails
2 vtx / Largeur : 1 812 mm / Hauteur : 2 379 mm », les variantes (« 16 Vantail principal à gauche », « 16B … ») et le volet
roulant. Pour chaque commande atelier liée à un chantier, le plan d'exé le plus récent du chantier est lu et rangé dans la
commande (atelier.data.exe) : le conditionnement (cond.js) part de ces lignes. Pages sans repère (Keller, détails) ignorées.
Aucun prix lu.

  python3 -I plans_exe.py essai    montre ce qui serait rangé
  python3 -I plans_exe.py          range
"""
import datetime, json, re, sys, urllib.parse, urllib.request
import pymupdf

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x"}   # l'hôte est authentifié par le proxy de l'environnement


def req(method, path, body=None, extra=None, raw=False):
    data = None if body is None else json.dumps(body).encode()
    h = {**H, **(extra or {})}
    if body is not None: h["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=h, method=method)) as r:
        b = r.read()
        return b if raw else (json.loads(b) if b else None)


def lire(octets):
    out = []
    for p in pymupdf.open(stream=octets, filetype="pdf"):
        B = [b[4].strip() for b in p.get_text("blocks") if b[4].strip()]
        titre = next((b for b in B if re.match(r"^ME\s?\d", b)), None)
        dims = next((b for b in B if re.search(r"Largeur\s*:", b) and re.search(r"Hauteur\s*:", b)), None)
        if not titre or not dims: continue
        t = " ".join(titre.split())
        m = re.match(r"^(ME[\s\d/\-]+?(?:\s*bis)?)\s*-\s*(.*)$", t, re.I)
        ref = re.sub(r"\s+", "", m.group(1)) if m else t.split(" ")[0]
        ref = re.sub(r"ME0+(\d)", r"ME\1", ref.upper()).replace("BIS", " bis")
        lieu_des = m.group(2) if m else ""
        lignes = [x.strip() for x in dims.split("\n") if x.strip()]
        des = next((x for x in lignes if not re.match(r"^(Largeur|Hauteur)", x)), "")
        num = lambda k: int(re.sub(r"\D", "", re.search(k + r"\s*:\s*([\d\s ]+)\s*mm", dims).group(1)))
        W, Hh = num("Largeur"), num("Hauteur")
        base = re.findall(r"\d+", ref)
        variantes = sorted({v for b in B for v in re.findall(r"(?m)^(\d+[A-Z]?)\s+(?:Vantail|Ouvrant|Fen|Porte)", b)
                            if base and re.match(r"^0*" + base[0] + r"[A-Z]?$", v)})
        q = max(len(base) if "/" in ref else 1, len(variantes), 1)
        vr = any(b.startswith("Volet roulant") for b in B)
        out.append({"ref": ref, "q": q, "des": des, "lieu": lieu_des, "W": W, "H": Hh, "vr": vr, "variantes": variantes})
    return out


def main(essai):
    chantiers = {r["id"]: r["data"] for r in req("GET", "/rest/v1/chantiers?select=id,data")}
    for a in req("GET", "/rest/v1/atelier?select=id,data"):
        d = a["data"]; c = chantiers.get(d.get("chantier") or "")
        if not c: continue
        plans = [x for x in c.get("docs") or [] if x.get("type") == "Plans d'exé" and (x.get("name") or "").lower().endswith(".pdf")]
        if not plans: continue
        cle = lambda x: (int((re.findall(r"EXE\s*(\d+)", x.get("name") or "", re.I) or ["0"])[-1]), str(x.get("at") or ""))
        p = sorted(plans, key=cle)[-1]
        if (d.get("exe") or {}).get("doc") == p["id"]: continue      # déjà lu
        try: L = lire(req("GET", "/storage/v1/object/documents/" + urllib.parse.quote(p["id"]), raw=True))
        except Exception as e: print(a["id"], "plan illisible :", type(e).__name__); continue
        print(a["id"], d.get("chantier"), p.get("name"), "->", len(L), "repères :", ", ".join(f"{x['ref']}×{x['q']} {x['W']}x{x['H']}{' VR' if x['vr'] else ''}" for x in L))
        if essai or not L: continue
        exe = {"doc": p["id"], "nom": p.get("name"), "le": datetime.date.today().isoformat(), "lignes": L}
        row = req("GET", "/rest/v1/atelier?select=data,version&id=eq." + urllib.parse.quote(a["id"]))[0]
        req("PATCH", "/rest/v1/atelier?id=eq." + urllib.parse.quote(a["id"]) + "&version=eq." + str(row["version"]),
            {"data": {**row["data"], "exe": exe}}, {"Prefer": "return=minimal"})


if __name__ == "__main__":
    main(len(sys.argv) > 1 and sys.argv[1] == "essai")
