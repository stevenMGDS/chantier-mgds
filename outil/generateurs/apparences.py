# Redessine l'apparence de chaque champ texte rempli (accents compris) pour qu'il se voie aussi en simple consultation.
import sys, pymupdf
doc = pymupdf.open(sys.argv[1])
n = 0
for page in doc:
    for w in page.widgets():
        if w.field_type in (pymupdf.PDF_WIDGET_TYPE_TEXT, pymupdf.PDF_WIDGET_TYPE_COMBOBOX):
            w.text_font = "Helv"
            if w.field_type == pymupdf.PDF_WIDGET_TYPE_TEXT and not w.text_fontsize:
                w.text_fontsize = 0
            w.update(); n += 1
        elif w.field_type == pymupdf.PDF_WIDGET_TYPE_CHECKBOX:
            w.update()
doc.need_appearances(False)
doc.save(sys.argv[2], garbage=3, deflate=True)
print(n, "champs texte redessinés")
