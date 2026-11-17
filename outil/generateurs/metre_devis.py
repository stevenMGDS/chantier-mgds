"""Fiche « Métré » (chantier en rénovation) pré-remplie d'après le devis, à partir du modèle 02 - Métré
(4 menuiseries en page 1, 8 en page 2, puis l'annexe).

  python3 -I metre_devis.py <modele metre.pdf> <sortie.pdf> <donnees.json>

donnees.json : {"client_nom", "adresse", "commercial", "devis", "date_devis", "lignes": [{"repere", "cote", "coloris", "vitrage"}]}
  repere : pièce + type + gamme (court, ~35 caractères) ; cote : « L × H » du devis ; coloris : « int./ext. » ; vitrage.
De 1 à 12 menuiseries. Les lignes non utilisées sont retirées (champs supprimés, zone masquée) pour que la fiche
puisse être complète. Ensuite : apparences.py.
"""
import io, json, sys
import pymupdf
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, ArrayObject
from reportlab.pdfgen import canvas

src, dst, spec = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
L = spec["lignes"]; n = len(L)
assert 1 <= n <= 12, "de 1 à 12 menuiseries avec ce modèle"
w = PdfWriter(clone_from=src)
nm = lambda a: str(a.get("/T") or a["/Parent"].get_object()["/T"])
rows = []
for pi in (0, 1):
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
if n <= 4: w.remove_page(1)
elif n < 12: masque(w.pages[1], rows[1][n - 4] + 3)
vis = {id(a.get_object()) for pg in w.pages for a in pg.get("/Annots") or []}
af = w._root_object["/AcroForm"]
af[NameObject("/Fields")] = ArrayObject(f for f in af["/Fields"] if id(f.get_object()) in vis
                                        or any(id(k.get_object()) in vis for k in f.get_object().get("/Kids", [])))

V = {"client_nom_0": spec["client_nom"], "adresse_chantier_0": spec["adresse"], "cellule_0_71": spec.get("commercial", "")}
for pi in range(min(2, len(w.pages) - 1)):
    A = [x.get_object() for x in w.pages[pi]["/Annots"]]
    for k, y in enumerate(rows[pi]):
        i = (0 if pi == 0 else 4) + k
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
    p.insert_text((700, 558), spec["client_nom"].replace("M. ", "").replace("MME ", "")[:30], fontsize=6.5, color=(0.35, 0.37, 0.4))
    if i == 0 and spec.get("devis"):   # en-tête « N° devis / date … du … » : date puis n° après « du »
        p.insert_text((588, 81), " ".join(x for x in (spec.get("date_devis", ""), "(" + spec["devis"] + ")") if x), fontsize=8.5, color=(0.1, 0.12, 0.15))
d.save(dst, garbage=1, deflate=True)
print(dst, ":", len(d), "pages ;", n, "menuiseries ;", len(V), "champs remplis")
