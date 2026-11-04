#!/usr/bin/env python3
"""Relevé des photos de consommables (sorties / retours au stock) par Claude.

  python3 -I outil/releve_conso.py liste <dossier>        télécharge les photos pas encore relues et affiche leur liste
  python3 -I outil/releve_conso.py ecrit <id> '<json>'    enregistre le relevé d'une photo et la marque comme relue

Le relevé est un JSON : {"articles":[{"a":"Silicone","fiche":"Silicone","c":"blanc","q":4,"u":"cartouche"}],"txt":"remarque"}
- a : article (nom courant) ; fiche : intitulé exact de la ligne dans la fiche de préparation, si on le connaît ;
- c : coloris (silicone, mastic, habillage) ; q : quantité ; u : unité (cartouche, bombe, rouleau, boîte, ml…).
Ne noter que ce qui se voit ou se compte sans doute possible ; sinon le dire dans « txt ».
L'appli reprend ces relevés : fenêtre Consommables de la fiche (bouton « Reporter dans la fiche ») et onglet Stock.
Accès : l'hôte Supabase est authentifié par le proxy de l'environnement « MGDS Supabase ».
"""
import json, os, sys, urllib.parse, urllib.request

BASE = "https://azgvzgenfykvlkuwevty.supabase.co"
H = {"apikey": "x", "Authorization": "Bearer x"}


def req(method, path, body=None, extra=None, raw=False):
    r = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={**H, "Content-Type": "application/json", **(extra or {})})
    with urllib.request.urlopen(r) as x:
        t = x.read()
        return t if raw else (json.loads(t) if t else None)


def liste(dossier):
    os.makedirs(dossier, exist_ok=True)
    rows = req("GET", "/rest/v1/photos?select=id,chantier,categorie,chemin,note,pris_le,poseur"
                      "&categorie=in.(conso_sortie,conso_retour)&traite=eq.false&order=pris_le")
    noms = {p["id"]: p.get("nom") or p["email"] for p in req("GET", "/rest/v1/profils?select=id,nom,email")}
    for p in rows:
        f = os.path.join(dossier, f"{p['id']}.jpg")
        with open(f, "wb") as o:
            o.write(req("GET", "/storage/v1/object/photos/" + urllib.parse.quote(p["chemin"]), raw=True))
        p["fichier"], p["par"] = f, noms.get(p["poseur"], "?")
        print(json.dumps({k: p[k] for k in ("id", "chantier", "categorie", "pris_le", "par", "note", "fichier")}, ensure_ascii=False))
    print(f"{len(rows)} photo(s) à relire")


def ecrit(pid, releve):
    o = json.loads(releve)
    assert isinstance(o.get("articles"), list), "il faut une liste « articles »"
    req("PATCH", f"/rest/v1/photos?id=eq.{int(pid)}", {"releve": json.dumps(o, ensure_ascii=False), "traite": True},
        {"Prefer": "return=minimal"})
    print("relevé enregistré pour la photo", pid)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["liste"]:
        liste(a[1] if len(a) > 1 else "photos-conso")
    elif a[:1] == ["ecrit"] and len(a) == 3:
        ecrit(a[1], a[2])
    else:
        print(__doc__)
