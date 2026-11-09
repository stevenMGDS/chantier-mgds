# Fiche « Réception de support » pour NICOLLIN, faite à partir du modèle MANCOSU (même mise en page, mêmes champs) :
# pages gardées : 1 (chantier, support et pose), 2 (2 menuiseries : les 2 côtés de la baie d'angle), 8 (coupes de principe), 9 (coupes fabricant).
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject, ArrayObject, DecodedStreamObject, TextStringObject

src, dst = sys.argv[1], sys.argv[2]
r = PdfReader(src)
w = PdfWriter()
GARDE = [0, 1, 7, 8]
for i in GARDE:
    w.add_page(r.pages[i])

def nom(a):
    p = a.get("/Parent")
    return str(a.get("/T") or (p.get_object().get("/T") if p is not None else ""))

# 1) page 2 : on ne garde que les menuiseries 1 et 2 (champs des n° 3 et 4 retirés, zone masquée en blanc)
p2 = w.pages[1]
garde = ArrayObject()
for ref in p2["/Annots"]:
    a = ref.get_object()
    n = nom(a)
    if n.endswith(("_3", "_4")) or "_3_" in n or "_4_" in n:
        continue
    garde.append(ref)
p2[NameObject("/Annots")] = garde
import io
from reportlab.pdfgen import canvas
buf = io.BytesIO(); cv = canvas.Canvas(buf, pagesize=(841.8898, 595.2756)); cv.setFillColorRGB(1, 1, 1)
cv.rect(15, 54, 815, 249, stroke=0, fill=1); cv.save(); buf.seek(0)
p2.merge_page(PdfReader(buf).pages[0])

# 2) pieds de page : n° de devis et numéros de page (page k/9 -> k/4)
ANCIEN, NOUVEAU = b"D251101601l", b"D260201708d"
for k, pg in enumerate(w.pages):
    c = pg.get_contents()
    d = c.get_data()
    n = d.count(ANCIEN)
    d = d.replace(ANCIEN, NOUVEAU)
    import re as _re
    d = _re.sub(rb"page \d/9\)", b"page %d/4)" % (k + 1), d)
    pg.replace_contents(DecodedStreamObject()) if False else None
    s2 = DecodedStreamObject(); s2.set_data(d)
    pg[NameObject("/Contents")] = w._add_object(s2)
    print("page", k + 1, ": n° de devis remplacé", n, "fois")

# 3) formulaire : seulement les champs des pages gardées, tout remis à vide
champs = ArrayObject()
for pg in w.pages:
    for ref in pg.get("/Annots") or []:
        a = ref.get_object()
        par = a.get("/Parent")
        cible = par if par is not None else ref
        if cible not in champs:
            champs.append(cible)
        a[NameObject("/AS")] = NameObject("/Off") if "/AP" in a and "/D" in a["/AP"] else a.get("/AS", NameObject("/Off"))
        f = cible.get_object()
        if f.get("/FT") == "/Btn" or a.get("/FT") == "/Btn":
            f[NameObject("/V")] = NameObject("/Off"); a[NameObject("/AS")] = NameObject("/Off")
        else:
            if "/V" in f:
                f[NameObject("/V")] = TextStringObject("")
            if "/AP" in a:
                del a["/AP"]  # apparence de MANCOSU : l'appli la redessine
af = r.trailer["/Root"]["/AcroForm"]
w._root_object[NameObject("/AcroForm")] = w._add_object(af.__class__())
for k, v in af.items():
    if k != "/Fields":
        w._root_object["/AcroForm"][NameObject(k)] = v
w._root_object["/AcroForm"][NameObject("/Fields")] = champs
w._root_object["/AcroForm"][NameObject("/NeedAppearances")] = BooleanObject(True)

INFO = "Keller minimal windows 38/50zt, noir 2100 sable · seuil sur dalle brute (purenit + EPDM, ±1 mm) · pré-cadre acier 3 côtés · ouvrant / galandage : voir plans EXE"
TXT = {
    0: {"client_nom_1": "M. MME NICOLLIN", "adresse_chantier_1": "18 DOMAINE DE LA JONQUIERE - 74940 ANNECY",
        "devis_1": "D260201708d", "commercial_1": "Stéphanie", "rem_lot": "Lot 05 - Menuiseries extérieures",
        "rem_moe": "SGTi - M. Claude Reffet", "rem_marque": "Keller minimal windows"},
    1: {"repere_1": "Séjour - baie d'angle, côté 1", "designation_1": "Baie en angle ouvrant + galandage, Keller minimal windows",
        "dimdevis_1": "7215 x 2440", "rem_info_1": INFO,
        "repere_2": "Séjour - baie d'angle, côté 2", "designation_2": "Baie en angle ouvrant + galandage, Keller minimal windows",
        "dimdevis_2": "7540 x 2440", "rem_info_2": INFO},
}
for i, vals in TXT.items():
    w.update_page_form_field_values(w.pages[i], vals, auto_regenerate=False)
# cases cochées : marque « Autre », pas de volet roulant (le BSO n'est pas à notre lot)
for i, noms in {0: ["marque_2"], 1: ["vr_1_0", "vr_2_0"]}.items():
    for ref in w.pages[i]["/Annots"]:
        a = ref.get_object()
        if nom(a) in noms:
            on = [k for k in a["/AP"]["/N"].keys() if k != "/Off"][0]
            a[NameObject("/AS")] = NameObject(on)
            (a["/Parent"].get_object() if "/Parent" in a else a)[NameObject("/V")] = NameObject(on)
for pg in w.pages:  # apparences des champs texte : laissées à l'appli (accents corrects)
    for ref in pg.get("/Annots") or []:
        a = ref.get_object(); ft = a.get("/FT") or (a["/Parent"].get_object().get("/FT") if "/Parent" in a else None)
        if ft in ("/Tx", "/Ch") and "/AP" in a:
            del a["/AP"]
w.add_metadata({"/Title": "Réception de support – chantier neuf – NICOLLIN"})
w.write(dst)

chk = PdfReader(dst)
f = chk.get_fields()
print(len(chk.pages), "pages,", len(f), "champs ; remplis :", {k: str(v.get("/V"))[:30] for k, v in f.items() if v.get("/V") not in (None, "", "/Off")})
