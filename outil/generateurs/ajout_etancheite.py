# Ajoute à une fiche « Réception de support » les cases d'étanchéité (Steven, 09/11/2026), sans toucher aux saisies :
#  - page 1, ligne Fixations : « Étanchéité : » + champ rem_etanch_base (étanchéité de base, toutes les menuiseries) ;
#  - chaque menuiserie, ligne « Infos devis » : « Étanchéité (si différente) : » + champ rem_etanch_<n>.
# Les noms commencent par rem_ : cases facultatives pour l'appli (une fiche déjà complète le reste).
import sys, pymupdf
from pypdf import PdfReader

src, dst = sys.argv[1], sys.argv[2]
avant = {k: v.get("/V") for k, v in (PdfReader(src).get_fields() or {}).items()}
d = pymupdf.open(src)
BLEU = (0.93, 0.96, 1.0)
GRIS = (0.18, 0.2, 0.22)

def champ(page, nom, rect):
    w = pymupdf.Widget()
    w.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
    w.field_name = nom
    w.rect = rect
    w.text_font = "Helv"
    w.text_fontsize = 7.5
    w.fill_color = BLEU
    w.border_width = 0
    page.add_widget(w)

ajout = 0
for page in d:
    H = page.rect.height
    noms = {w.field_name: w for w in page.widgets()}
    if "rem_etanch_base" in noms or any(n.startswith("rem_etanch_") for n in noms):
        continue
    # page 1 : la case « type » des fixations est raccourcie, l'étanchéité prend la fin de la ligne
    if "rem_fix" in noms:
        w = noms["rem_fix"]; r = w.rect
        w.rect = pymupdf.Rect(r.x0, r.y0, 590, r.y1); w.update()
        page.insert_text((596, r.y1 - 2.5), "Étanchéité :", fontsize=8, fontname="hebo", color=GRIS)
        champ(page, "rem_etanch_base", pymupdf.Rect(648, r.y0, 822, r.y1)); ajout += 1
    # menuiseries : la ligne « Infos devis » est partagée
    for nom, w in noms.items():
        if not nom.startswith("rem_info_"):
            continue
        k = nom.split("_")[-1]; r = w.rect
        w.rect = pymupdf.Rect(r.x0, r.y0, 520, r.y1); w.update()
        page.insert_text((526, r.y1 - 2.5), "Étanchéité (si différente) :", fontsize=7.5, fontname="helv", color=GRIS)
        champ(page, "rem_etanch_" + k, pymupdf.Rect(632, r.y0, r.x1, r.y1)); ajout += 1
d.save(dst, garbage=1, deflate=True)
apres = {k: v.get("/V") for k, v in (PdfReader(dst).get_fields() or {}).items()}
perdus = [k for k in avant if avant[k] not in (None, "", "/Off") and apres.get(k) != avant[k]]
assert not perdus, perdus
print(ajout, "cases ajoutées ;", len(apres), "champs ; saisies intactes")
