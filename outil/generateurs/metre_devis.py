"""Fiche « Métré » (chantier en rénovation) pré-remplie d'après le devis, à partir du modèle 02 - Métré
(4 menuiseries en page 1, 8 par page suivante, puis l'annexe).

  python3 -I metre_devis.py <modele metre.pdf> <sortie.pdf> <donnees.json>

donnees.json : {"client_nom", "adresse", "commercial", "devis", "date_devis", "lignes": [{"repere", "cote", "coloris", "vitrage"}]}
  repere : pièce + type + gamme (court, ~35 caractères) ; cote : « L × H » du devis ; coloris : « int./ext. » ; vitrage.
De 1 à 60 menuiseries (pages de 8 ajoutées au besoin). Les lignes non utilisées sont retirées (champs supprimés, zone masquée) pour que la fiche
puisse être complète. Ensuite : apparences.py.
"""
import io, json, sys
import pymupdf
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, ArrayObject, TextStringObject
from reportlab.pdfgen import canvas

src, dst, spec = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
L = spec["lignes"]; n = len(L)
assert 1 <= n <= 60, "de 1 à 60 menuiseries"
m = max(0, -(-(n - 4) // 8))            # pages de 8 menuiseries après la page 1
w = PdfWriter(clone_from=src)
nm = lambda a: str(a.get("/T") or a["/Parent"].get_object()["/T"])
for k in range(2, m + 1):               # pages 2 en plus : copie de la page 2 du modèle, champs renommés
    r = PdfReader(src); pg = r.pages[1]; vus = set()
    for x in pg["/Annots"]:   # chaque widget devient un champ autonome (pypdf ne recopie pas les parents)
        a = x.get_object()
        if "/Parent" in a:
            par = a["/Parent"].get_object()
            for cle in ("/T", "/FT", "/Ff", "/DA", "/V", "/DV", "/Q", "/MaxLen", "/Opt"):
                if cle in par and cle not in a: a[NameObject(cle)] = par[cle]
            del a["/Parent"]
        if "/T" in a: a[NameObject("/T")] = TextStringObject(str(a["/T"]) + f"_p{k}")
    w.insert_page(pg, index=k)
rows = []
for pi in range(0, 1 + max(m, 1)):
    A = [x.get_object() for x in w.pages[pi]["/Annots"]]
    rows.append(sorted({round(float(a["/Rect"][3])) for a in A if round(float(a["/Rect"][0])) == 98}, reverse=True))


def masque(pg, y_haut):
    """retire les champs sous y_haut et masque la zone (lignes non utilisées)"""
    pg[NameObject("/Annots")] = ArrayObject(a for a in pg["/Annots"] if not (60 < float(a.get_object()["/Rect"][3]) <= y_haut + 2))
    W, H = float(pg.mediabox.width), float(pg.mediabox.height)
    buf = io.BytesIO(); cv = canvas.Canvas(buf, pagesize=(W, H)); cv.setFillColorRGB(1, 1, 1)
    cv.rect(15, 60, W - 30, y_haut + 3 - 60, stroke=0, fill=1); cv.save(); buf.seek(0)
    pg.merge_page(PdfReader(buf).pages[0])


if n < 4: masque(w.pages[0], rows[0][n] + 3)
if m == 0: w.remove_page(1)
else:
    reste = n - 4 - 8 * (m - 1)
    if reste < 8: masque(w.pages[m], rows[m][reste] + 3)
# champs du formulaire : exactement ceux des pages
champs, vus = ArrayObject(), set()
for pg in w.pages:
    for x in pg.get("/Annots") or []:
        a = x.get_object(); c = a.raw_get("/Parent") if "/Parent" in a else x
        if id(c.get_object()) not in vus: vus.add(id(c.get_object())); champs.append(c)
w._root_object["/AcroForm"][NameObject("/Fields")] = champs

V = {"client_nom_0": spec["client_nom"], "adresse_chantier_0": spec["adresse"], "cellule_0_71": spec.get("commercial", "")}
for pi in range(0, 1 + m):
    A = [x.get_object() for x in w.pages[pi]["/Annots"]]
    for k, y in enumerate(rows[pi]):
        i = k if pi == 0 else 4 + 8 * (pi - 1) + k
        if i >= n: break
        def at(x, dy):
            c = [a for a in A if abs(round(float(a["/Rect"][0])) - x) <= 3 and abs(round(float(a["/Rect"][3])) - (y - dy)) <= 3]
            return nm(c[0]) if c else None
        for x, dy, cle in ((98, 0, "repere"), (244, 0, "cote"), (133, 37, "coloris"), (207, 37, "vitrage")):
            if L[i].get(cle) and at(x, dy): V[at(x, dy)] = L[i][cle]
for pg in w.pages: w.update_page_form_field_values(pg, V, auto_regenerate=False)
tmp = io.BytesIO(); w.write(tmp)

# pied de page (nom du chantier du modèle) et n° de devis dans l'en-tête
d = pymupdf.open(stream=tmp.getvalue(), filetype="pdf")
for i, p in enumerate(d):
    for r in p.search_for("FOYER LES BELETTES"):
        p.add_redact_annot(r, fill=(1, 1, 1))
    p.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE)
    if i >= 2:   # pages copiées (et annexe après elles) : numéros des menuiseries et de page
        for b in p.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for sp in l["spans"]:
                    t = sp["text"].strip()
                    cnt = min(8, n - 4 - 8 * (i - 1))   # lignes utilisées sur cette page (les autres sont masquées)
                    if t.isdigit() and ((i <= m and sp["bbox"][0] < 70 and int(t) - 4 <= cnt) or sp["bbox"][1] > 540):
                        new = str(int(t) + 8 * (i - 1)) if sp["bbox"][0] < 70 else str(i + 1)
                        p.add_redact_annot(pymupdf.Rect(sp["bbox"]), fill=None); p.apply_redactions(images=0, graphics=0)
                        p.insert_text(sp["origin"], new, fontsize=sp["size"], fontname="hebo" if sp["bbox"][0] < 70 else "helv")
    p.insert_text((700, 558), spec["client_nom"].replace("M. ", "").replace("MME ", "")[:30], fontsize=6.5, color=(0.35, 0.37, 0.4))
    if i == 0 and spec.get("devis"):   # en-tête « N° devis / date … du … » : date puis n° après « du »
        p.insert_text((588, 81), " ".join(x for x in (spec.get("date_devis", ""), "(" + spec["devis"] + ")") if x), fontsize=8.5, color=(0.1, 0.12, 0.15))
d.save(dst, garbage=1, deflate=True)
print(dst, ":", len(d), "pages ;", n, "menuiseries ;", len(V), "champs remplis")
