"""Fiche « Réception de support » (chantier neuf) pour n'importe quel chantier, à partir du modèle MANCOSU
(4 menuiseries par page, champs repere_<n>, designation_<n>, dimdevis_<n>, rem_info_<n>…).

  python3 -I support_rs.py <modele MANCOSU.pdf> <sortie.pdf> <donnees.json>

donnees.json : {"devis", "client_nom", "adresse", "commercial", "rem_lot", "rem_moe", "marque": "Autre"|…, "rem_marque",
                "menuiseries": [{"repere", "designation", "dimdevis", "rem_info"}], "coupes": [7] (pages de coupes gardées)}
Ensuite : ajout_etancheite.py puis apparences.py (comme toute nouvelle fiche RS).
Une paire de menuiseries vide en bas de la dernière page est retirée et masquée ; une menuiserie seule à droite reste
en cadre vide sans champs.
"""
import io, json, re, sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject, ArrayObject, DecodedStreamObject, TextStringObject
from reportlab.pdfgen import canvas

src, dst, spec = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
M = spec["menuiseries"]; n = len(M)
assert 1 <= n <= 21, "de 1 à 21 menuiseries avec ce modèle"
r = PdfReader(src)
pages_m = (n + 3) // 4                       # pages de menuiseries (modèle : pages 2 à 7)
GARDE = [0] + list(range(1, 1 + pages_m)) + list(spec.get("coupes", [7]))
w = PdfWriter()
for i in GARDE: w.add_page(r.pages[i])
total = len(GARDE)


def nom(a):
    p = a.get("/Parent")
    return str(a.get("/T") or (p.get_object().get("/T") if p is not None else ""))


def num(n_):
    m = re.search(r"_(\d+)(?:_\d+)?$", n_)
    return int(m.group(1)) if m else None


# champs des menuiseries au-delà de n retirés ; paire du bas vide masquée
for k in range(1, 1 + pages_m):
    pg = w.pages[k]
    garde = ArrayObject()
    reste = n - 4 * (k - 1)
    for ref in pg["/Annots"]:
        a = ref.get_object(); x = num(nom(a))
        if nom(a).split("_")[0] in ("repere", "designation", "dimdevis", "rem", "brut", "cde", "allege", "vr", "rej", "fa") and x and x > n:
            continue
        garde.append(ref)
    pg[NameObject("/Annots")] = garde
    reste = n - 4 * (k - 1)
    if reste <= 2:   # tout ce qui est dans la moitié basse disparaît (champs restants compris)
        pg[NameObject("/Annots")] = ArrayObject(x for x in pg["/Annots"] if float(x.get_object()["/Rect"][3]) > 305)
        buf = io.BytesIO(); cv = canvas.Canvas(buf, pagesize=(841.8898, 595.2756)); cv.setFillColorRGB(1, 1, 1)
        cv.rect(15, 54, 815, 249, stroke=0, fill=1); cv.save(); buf.seek(0)
        pg.merge_page(PdfReader(buf).pages[0])

# pieds de page : n° de devis et numéros de page
ANCIEN = b"D251101601l"
for k, pg in enumerate(w.pages):
    d = pg.get_contents().get_data().replace(ANCIEN, spec["devis"].encode())
    d = re.sub(rb"page \d+/9\)", b"page %d/%d)" % (k + 1, total), d)
    s2 = DecodedStreamObject(); s2.set_data(d)
    pg[NameObject("/Contents")] = w._add_object(s2)

# formulaire : champs des pages gardées, tout remis à vide
champs = ArrayObject()
for pg in w.pages:
    for ref in pg.get("/Annots") or []:
        a = ref.get_object(); par = a.get("/Parent"); cible = par if par is not None else ref
        if cible not in champs: champs.append(cible)
        f = cible.get_object()
        if f.get("/FT") == "/Btn" or a.get("/FT") == "/Btn":
            f[NameObject("/V")] = NameObject("/Off"); a[NameObject("/AS")] = NameObject("/Off")
        else:
            if "/V" in f: f[NameObject("/V")] = TextStringObject("")
            if "/AP" in a: del a["/AP"]
af = r.trailer["/Root"]["/AcroForm"]
w._root_object[NameObject("/AcroForm")] = w._add_object(af.__class__())
for k, v in af.items():
    if k != "/Fields": w._root_object["/AcroForm"][NameObject(k)] = v
w._root_object["/AcroForm"][NameObject("/Fields")] = champs
w._root_object["/AcroForm"][NameObject("/NeedAppearances")] = BooleanObject(True)

TXT = {0: {"client_nom_1": spec["client_nom"], "adresse_chantier_1": spec["adresse"], "devis_1": spec["devis"],
           "commercial_1": spec.get("commercial", ""), "rem_lot": spec.get("rem_lot", ""), "rem_moe": spec.get("rem_moe", ""),
           "rem_marque": spec.get("rem_marque", "")}}
for i, m in enumerate(M, 1):
    TXT.setdefault(1 + (i - 1) // 4, {}).update({f"repere_{i}": m.get("repere", ""), f"designation_{i}": m.get("designation", ""),
                                                f"dimdevis_{i}": m.get("dimdevis", ""), f"rem_info_{i}": m.get("rem_info", "")})
for i, vals in TXT.items():
    w.update_page_form_field_values(w.pages[i], {k: v for k, v in vals.items() if v}, auto_regenerate=False)
# marque : case cochée d'après spec["marque_case"] (ex. « marque_2 » = Autre)
if spec.get("marque_case"):
    for ref in w.pages[0]["/Annots"]:
        a = ref.get_object()
        if nom(a) == spec["marque_case"]:
            on = [k for k in a["/AP"]["/N"].keys() if k != "/Off"][0]
            a[NameObject("/AS")] = NameObject(on); (a["/Parent"].get_object() if "/Parent" in a else a)[NameObject("/V")] = NameObject(on)
for pg in w.pages:
    for ref in pg.get("/Annots") or []:
        a = ref.get_object(); ft = a.get("/FT") or (a["/Parent"].get_object().get("/FT") if "/Parent" in a else None)
        if ft in ("/Tx", "/Ch") and "/AP" in a: del a["/AP"]
w.add_metadata({"/Title": "Réception de support – chantier neuf – " + spec["client_nom"]})
w.write(dst)
chk = PdfReader(dst)
print(len(chk.pages), "pages,", len(chk.get_fields()), "champs ; menuiseries :", n)
