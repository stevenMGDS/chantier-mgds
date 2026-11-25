// ---------- Métré sur tablette (essai, Steven 20/11/2026) ----------
// Fiche « Métré » en HTML, pensée pour la tablette de Yannick : un produit par fiche, adaptée à sa famille
// (fenêtres, porte d'entrée, porte de garage, occultation, portail, véranda), habillages en lignes (plats, cornières,
// coloris), étanchéité et consommables repris du système existant, coupes de principe où les habillages se dessinent,
// croquis quadrillé, le tout annotable au doigt ou au stylet. Le coulissant minimaliste garde la réception de support.
// Les données sont rangées dans la fiche du chantier, dans un document « Métré » (docs[].mt) : le profil terrain
// (Yannick, Stéphanie) peut l'écrire sans nouvelle règle dans la base. Le métré PDF existant reste disponible.
(()=>{
const $m=id=>document.getElementById(id);
const C=(l,o,x={})=>({l,t:"c",o,...x}),M=(l,x={})=>({l,t:"mm",...x}),T=(l,x={})=>({l,t:"t",...x}),N=(l,x={})=>({l,t:"n",...x}),MU=(l,o,x={})=>({l,t:"m",o,...x}),CMD={l:"Cote de commande",t:"cmd"};
const TRI=(l,sub,x={})=>({l,t:"tri",sub,...x});
// seuil et sol (Steven, 23/11/2026) : habillage, rejingot, sol à déduire, futur carrelage
const futur=v=>/Futur|Chape/.test(v["Sol intérieur"]||"");
const SEUIL=()=>[C("Seuil",["Standard","Extra-plat PMR","Encastré","Sur rejingot"]),C("Sol intérieur",["Fini (existant)","Futur carrelage / parquet","Chape à venir"]),
  M("Épaisseur du futur sol",{w:futur}),C("Sol à déduire de la hauteur",["Oui","Non"],{w:futur}),C("Rejingot / appui extérieur",["Existant","À créer","Aucun"]),
  C("Habillage du seuil",["Aucun","Cornière","Plat","Tôle pliée"],{opt:1}),M("Hauteur du seuil fini",{opt:1})];
const porteF=v=>/Porte-fenêtre|Coulissant/.test(v["Type"]||"");
const tv=v=>v["Type de volet roulant"]||"",vr=v=>v["Produit"]==="Volet roulant",kit=v=>vr(v)&&/^Kit/.test(tv(v)),bat=v=>/battant|Persienne/.test(v["Produit"]||""),
  zip=v=>/zip/.test(v["Produit"]||""),bso=v=>v["Produit"]==="BSO",banne=v=>v["Produit"]==="Store banne";
const FAM={
 fen:{n:"Fenêtres et portes-fenêtres",g:[
  ["Produit",[C("Type",["Fenêtre","Porte-fenêtre","Coulissant","Fixe","Soufflet"]),C("Matière",["PVC","PVC/alu","Alu","Bois"]),N("Vantaux"),C("Sens (vue int.)",["TD","TG","Fixe"]),T("Coloris int. / ext.")]],
  ["Pose",[C("Type de pose",["Neuf applique","Réno","Dépose totale","Tunnel"]),M("Épaisseur du dormant existant",{opt:1}),M("Épaisseur d'isolation (doublage)")]],
  ["Dimensions",[M("Tableau L"),M("Tableau H"),M("Hors tout L",{opt:1}),M("Hors tout H",{opt:1}),M("Hauteur d'allège",{opt:1,w:v=>!porteF(v)}),CMD]],
  ["Seuil et sol",SEUIL(),porteF],
  ["Vitrage et options",[C("Vitrage",["Double","Triple","Feuilleté","Phonique","Granité"]),C("Petits bois",["Non","Incorporés","Collés"],{opt:1}),C("Appui",["Appui existant","Appui alu","Bavette"],{opt:1,w:v=>!porteF(v)}),C("Ventilation",["Aucune","Grille"]),C("Occultation",["Aucune","Volet roulant","Store zip","BSO"],{opt:1})]],
  ["Volet roulant intégré",[C("Coffre",["Bloc-baie (sur la menuiserie)","Coffre tunnel","Coffre rénovation"]),C("Taille du coffre",["125","137","150","165","180","205"],{opt:1}),
    C("Manœuvre",["Sangle","Treuil + manivelle","Moteur filaire","Radio RTS","Radio io","Solaire"]),C("Côté de manœuvre (vue int.)",["Gauche","Droite"]),
    C("Alimentation électrique",["Présente à gauche","Présente à droite","À créer","Sans objet"],{w:v=>!/Sangle|Treuil/.test(v["Manœuvre"]||"")}),T("Coloris du tablier")],v=>v["Occultation"]==="Volet roulant"]]},
 porte:{n:"Porte d'entrée",g:[
  ["Produit",[C("Matière",["Alu","PVC","PVC/alu","Bois","Acier"]),T("Modèle",{opt:1}),T("Coloris int. / ext. (RAL)"),C("Sens d'ouverture (vue int.)",["Tirant droit","Tirant gauche","Poussant droit","Poussant gauche"],{h:"Tirant : ouvre vers l'intérieur (à la française). Poussant : vers l'extérieur (à l'anglaise)."}),C("Porte tiercée",["Non","Oui"],{opt:1}),N("Vantaux"),C("Vitrage",["Sans","Double","Triple","Feuilleté","Granité"],{opt:1})]],
  ["Pose et dimensions",[C("Dormant",["Réno + habillages","Neuf"]),M("Épaisseur d'isolation (doublage)",{opt:1}),M("Tableau L"),M("Tableau H"),M("Hors tout L",{opt:1}),M("Hors tout H",{opt:1}),M("Épaisseur du bâti existant",{opt:1}),M("Largeur du vantail principal",{opt:1}),CMD]],
  ["Seuil et sol",SEUIL()],["Imposte",[C("Imposte / fixe latéral",["Aucun","Rectangulaire","Cintre","Plein cintre"])]],
  ["Quincaillerie",[C("Serrure",["3 points","5 points","Automatique","Connectée"]),C("Tirage",["Béquille","Barre de tirage"],{opt:1}),MU("Options",["Ferme-porte","Gâche électrique","Judas","Boîte aux lettres"],{opt:1}),T("Arrivée électrique",{opt:1})]]]},
 garage:{n:"Porte de garage",g:[
  ["Produit",[C("Type",["Sectionnelle","Basculante","Enroulable","Battante"]),T("Coloris int. / ext."),MU("Options",["Hublots","Portillon intégré"],{opt:1})]],
  ["Dimensions",[M("Tableau L"),M("Tableau H"),M("Retombée de linteau"),M("Écoinçon gauche"),M("Écoinçon droit"),M("Profondeur dégagée"),M("Hauteur sous plafond",{opt:1})]],
  ["Sol et électricité",[C("Sol",["De niveau","En pente","Seuil"]),C("Prise électrique à proximité",["Oui","Non"]),C("Motorisation",["Oui","Non"]),N("Télécommandes",{opt:1})]]]},
 occ:{n:"Occultation",g:[
  ["Produit",[C("Produit",["Volet roulant","Volet battant","Persienne","Store zip / screen","BSO","Store banne"]),
    C("Type de volet roulant",["Rénovation (coffre extérieur)","Traditionnel (coffre intérieur)","Bloc-baie (sur la menuiserie)","Coffre à enduire (Termo, Rapido)","Kit motorisation sur VR existant"],{w:vr}),
    C("Position du coffre",["En façade","En tableau"],{w:v=>vr(v)&&/Rénovation/.test(tv(v))}),
    C("Pose",["En tableau","En façade","Sous linteau","Au plafond"],{w:zip}),T("Gamme / fabricant",{opt:1})]],
  ["Dimensions",[TRI("Largeur entre tableaux",["en haut","au milieu","en bas"],{w:v=>!banne(v)&&!kit(v)}),TRI("Hauteur de tableau",["à gauche","au milieu","à droite"],{w:v=>!banne(v)&&!kit(v)}),
    M("Profondeur du tableau",{w:v=>(vr(v)&&!kit(v))||zip(v)||bat(v)}),M("Hauteur disponible au-dessus de l'ouverture",{opt:1,w:v=>(vr(v)&&!kit(v))||zip(v)||bso(v)}),M("Largeur entre tapées",{opt:1,w:v=>(vr(v)&&!kit(v))||bat(v)}),
    M("Largeur",{w:banne}),M("Avancée",{w:banne}),M("Hauteur de pose",{w:banne})],v=>!kit(v)],
  ["Volet existant à motoriser",[C("Axe existant",["Octogonal 40","Octogonal 60","Rond","Autre"]),M("Largeur du tablier"),M("Hauteur du tablier"),C("Accès au coffre",["Trappe intérieure","Coffre extérieur démontable","Tunnel (par l'intérieur)"]),C("Ancienne manœuvre",["Sangle","Treuil","Moteur"])],kit],
  ["Coffre et coulisses",[C("Forme du coffre",["Pan coupé 45°","Quart de rond","Carré"],{w:v=>/Rénovation/.test(tv(v))}),C("Taille du coffre",["125","137","150","165","180","205","250"]),
    C("Coulisses",["Fixées en tableau","Fixées en façade"]),C("Appui",["Droit","Débordant (coulisses à découper)"],{opt:1})],v=>(vr(v)&&!kit(v))||zip(v)],
  ["Tablier",[C("Lames",["Alu 39","Alu 42","Alu 55","PVC","Alu sécurité"]),T("Coloris du tablier"),T("Coloris coffre et coulisses"),C("Lame finale",["Standard","Avec joint"],{opt:1})],v=>vr(v)&&!kit(v)],
  ["Volet battant",[C("Matière",["Alu","PVC","Bois"]),N("Vantaux"),C("Modèle",["Plein (barres et écharpe)","Plein sans écharpe","Persienné","Cadre + panneau","Persienne repliable"]),
    C("Gonds",["À sceller","À visser (scellement chimique)","Sur platine","Gonds existants conservés"]),C("Pentures",["Droites","Contre-coudées"]),C("Arrêts",["Marseillais","Tête de bergère","Automatiques","À visser en façade"]),
    C("Fermeture",["Espagnolette","Crémone","Barre"]),C("Repliable en tableau",["Non","Oui"],{opt:1}),T("Coloris")],bat],
  ["Toile et lames",[C("Toile",["Screen","Soltis","Opaque / occultante"],{w:zip}),T("Coloris de la toile",{w:v=>zip(v)||banne(v)}),C("Lames BSO",["C80","Z90","S90"],{w:bso}),C("Guidage",["Coulisses","Câbles"],{w:bso}),
    C("Coffre ou linteau",["Linteau caché sous enduit","Coffre apparent","Linteau existant"],{w:bso}),T("Coloris lames et coulisses",{w:bso})],v=>zip(v)||bso(v)||banne(v)],
  ["Store banne",[C("Type de store",["Coffre intégral","Semi-coffre","Monobloc"]),C("Support",["Mur","Plafond","Chevrons","Sous-face"]),T("Inclinaison (°)",{opt:1}),C("Lambrequin",["Non","Fixe","Enroulable"])],banne],
  ["Manœuvre et électricité",[C("Manœuvre",["Sangle","Treuil + manivelle","Moteur filaire","Radio RTS","Radio io","Solaire"]),C("Côté de manœuvre (vue int.)",["Gauche","Droite"]),
    C("Alimentation électrique",["Présente à gauche","Présente à droite","À créer","Sans objet"],{w:v=>!/Sangle|Treuil/.test(v["Manœuvre"]||"")}),C("Point de commande",["Inter filaire","Télécommande","Domotique / box"],{w:v=>/Moteur|Radio|Solaire/.test(v["Manœuvre"]||"")}),
    C("Capteur",["Aucun","Vent","Vent et soleil"],{opt:1,w:v=>zip(v)||bso(v)||banne(v)})],v=>!bat(v)],
  ["Existant à déposer",[MU("Dépose",["Rien","Ancien volet roulant","Volets battants","Gonds et arrêts","Persiennes"])],v=>!kit(v)]]},
 portail:{n:"Portail et portillon",g:[
  ["Produit",[C("Type",["Battant","Coulissant","Portillon"]),C("Matière",["Alu","PVC","Acier"]),T("Modèle et teinte")]],
  ["Piliers et terrain",[M("Entre piliers en haut"),M("Entre piliers en bas"),M("Hauteur"),C("Piliers",["Maçonnés","Alu","À créer"]),C("Aplomb des piliers",["Bon","À reprendre"]),C("Terrain",["Plat","En pente vers la maison","En pente vers la rue"])]],
  ["Ouverture",[C("Sens (vue de la rue)",["Vers l'intérieur","Vers l'extérieur"]),C("Vantaux",["Égaux","Inégaux"],{opt:1}),T("Répartition si inégaux (mm / mm)",{opt:1}),C("Refoulement (coulissant)",["Vers la gauche","Vers la droite"],{opt:1}),M("Longueur de refoulement disponible",{opt:1}),C("Guidage",["Guide supérieur","Guide latéral","Poteau"],{opt:1})]],
  ["Motorisation",[C("Moteur",["Non","Fourni MGDS","Client"]),C("Gaine électrique au pilier",["Oui","Non"],{opt:1}),MU("Accessoires",["Photocellules","Feu","Interphone","Visiophone"],{opt:1})]]]},
 veranda:{n:"Véranda et pergola",g:[
  ["Dimensions",[M("Façade : longueur"),M("Pignon gauche : profondeur"),M("Pignon droit : profondeur"),M("Hauteur du muret",{opt:1}),M("Hauteur au faîtage"),M("Hauteur des soubassements",{opt:1})]],
  ["Support",[C("Mur porteur",["Bon état","À vérifier"]),C("Dalle",["De niveau","Hors niveau","À créer"]),T("Teinte (RAL)")]],
  ["Châssis",[T("Façade : coulissants, fixes, porte (quantités)"),T("Pignons : coulissants, fixes (quantités)",{opt:1}),C("Vitrage",["Standard","Contrôle solaire","Feuilleté"])]],
  ["Toiture et options",[C("Toiture",["Polycarbonate","Panneau isolant","Vitrage"]),M("Épaisseur de toiture"),C("Chéneau",["Standard","Double"]),C("Descente d'eau (vue int.)",["Gauche","Droite"]),MU("Options",["Ventilation","Volets de toiture","BSO","Éclairage","Prises"],{opt:1})]]]}};
// systèmes existants de l'appli (habillages des annexes du métré, consommables du stock, vis)
const HAB_POS={"Tour ext. (montants + haut)":(L,H)=>2*H+L,"Montants ext.":(L,H)=>2*H,"Haut ext.":(L,H)=>L,"Bas ext.":(L,H)=>L,"Tour int. (montants + haut)":(L,H)=>2*H+L,"Montants int.":(L,H)=>2*H,"Haut int.":(L,H)=>L,"Bas int.":(L,H)=>L};
const HAB_PROF=["Cornière C20x20","Cornière C30x30","Cornière C40x40","Cornière C50x50","Cornière C60x60","Plat P30","Plat P40","Plat P50","Plat P60","Plat P80","Plat P100","Tôle pliée sur mesure","Fourni menuiserie"];
const HAB_COLS=["Blanc RAL 9016","Noir RAL 9005","Gris anthracite RAL 7016","Gris clair RAL 7035","Alu anodisé","Autre RAL"];
const SIL=["Blanc","Gris clair","Gris alu","Gris 7016","Ton pierre","Bronze","Noir","Transparent"];
const COMP={"3x7x15":8,"3x7x20":8,"4x11":5.6,"5x14":4.3,"9x20 ISO-BLOCO":12};
const VIS={"SFS blanche":[72,92,112,132,152,182,212],"SFS noire":[72,92,112,132,152,182,212],"Vis béton":[60,80,100,120,150],"Vis bois":[30,40,50,60,70,80,100,120],"Pattes de fixation":["—"],"Autre":["—"]};
const ETF=["fen","porte"],COUL={Rouge:"#c0392b",Bleu:"#1f5fbf",Noir:"#1d2633"};
const SPOT={he:"Haut ext.",be:"Bas ext.",hi:"Haut int.",bi:"Bas int.",me:"Montants ext.",mi:"Montants int."};
const esc2=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const mlf=n=>(n/1000).toLocaleString("fr-FR",{maximumFractionDigits:1})+" ml";
const famGuess=s=>{s=(s||"").toLowerCase();return/porte d.entr|porte entr/.test(s)?"porte":/garage|sectionnel|basculant/.test(s)?"garage":/portail|portillon|cl[oô]ture/.test(s)?"portail":
  /\+\s*(vr|volet)/.test(s)?"fen":/\bvr\b|\bvb\b|volet|store|bso|zip|screen|persienne|brise.soleil|kit motor/.test(s)?"occ":/v[ée]randa|pergola/.test(s)?"veranda":"fen"};
// « CHAMBRE VR réno NEOLITE » → repère CHAMBRE, désignation « VR réno NEOLITE » ; « SO 0-4 F 2 vtx+VR » → SO 0-4 / F 2 vtx+VR
const STOP=/^(VR|VB|PS|PF|F|BSO|FEN\.?|VOLETS?\d*|STORES?|PORTE|KIT|OB|FIXE|CHASSIS|CHÂSSIS)$/i;
function coupeRep(t){const w=(t||"").trim().split(/\s+/),r=[];for(const x of w){if((x===x.toUpperCase()&&/[A-ZÀ-Ü]/.test(x)||/^[\d\-\/.]+$/.test(x)||/^[A-Za-z]{1,3}-[\d-]+$/.test(x))&&!STOP.test(x))r.push(x);else break}
  if(r.length===w.length)return{r:"",d:t.trim()};return{r:r.join(" "),d:w.slice(r.length).join(" ")}}
function preRemplir(p){const s=(p.r+" "+p.d).toLowerCase(),v=p.v,put=(k,x)=>{if(x&&(v[k]===undefined||v[k]===""))v[k]=x},n=(/(\d)\s*vtx/.exec(s)||[])[1];
  const man=/solaire/.test(s)?"Solaire":/\bio\b/.test(s)?"Radio io":/\brts\b/.test(s)?"Radio RTS":/filaire/.test(s)?"Moteur filaire":/sangle/.test(s)?"Sangle":/treuil|manivelle/.test(s)?"Treuil + manivelle":"";
  if(p.f==="occ"){const pr=/battant|\bvb\b/.test(s)?"Volet battant":/persienne/.test(s)?"Persienne":/zip|screen/.test(s)?"Store zip / screen":/bso|brise/.test(s)?"BSO":/banne/.test(s)?"Store banne":"Volet roulant";put("Produit",pr);
    if(pr==="Volet roulant")put("Type de volet roulant",/kit motor/.test(s)?"Kit motorisation sur VR existant":/r[ée]no/.test(s)?"Rénovation (coffre extérieur)":/tradi/.test(s)?"Traditionnel (coffre intérieur)":/termo|enduire|monobloc/.test(s)?"Coffre à enduire (Termo, Rapido)":/bloc.?baie/.test(s)?"Bloc-baie (sur la menuiserie)":"");
    put("Manœuvre",man);if(/battant|persienne/.test(s)){put("Matière",/alu/.test(s)?"Alu":/pvc/.test(s)?"PVC":/bois/.test(s)?"Bois":"");if(n)put("Vantaux",+n)}
    const gm=/(roma|neolite|reveau|bubendorff|profalux|franciaflex|somfy|kl-fp)[^,]*/i.exec(p.d);if(gm)put("Gamme / fabricant",gm[0].trim())}
  const mat=/\bkf\s?\d|\bkv\s?\d|internorm kf/.test(s)?"PVC/alu":/\bhf\s?\d/.test(s)?"Bois/alu":/\bks\s?\d|\bpvc\b/.test(s)?"PVC":/technal|k-?line|keller|reveau|schuco|sch[üu]co|\balu\b/.test(s)?"Alu":/\bbois\b/.test(s)?"Bois":"";
  if((p.f==="fen"||p.f==="porte")&&mat){put("Matière",mat);p.src=p.src||{};if(p.v["Matière"]===mat)p.src["Matière"]=mat}
  if(p.f==="fen"&&!p.v["Petits bois"]&&!/petits? bois/.test(s)){p.v["Petits bois"]="Non";p.src=p.src||{};p.src["Petits bois"]="Non"}
  if(p.f==="fen"){if(/\+\s*(vr|volet)/.test(s)){put("Occultation","Volet roulant");put("Manœuvre",man)}
    put("Type",/coulis/.test(s)?"Coulissant":/\bpf\b|porte.fen/.test(s)?"Porte-fenêtre":/\bf\b|fen/.test(s)?"Fenêtre":/fixe/.test(s)?"Fixe":"");if(n)put("Vantaux",+n)}}

const newProd=(r,d,f,cote)=>({k:Math.random().toString(36).slice(2,9),r:r||"",d:d||"",f:f||famGuess(d),cote:cote||"",v:{},hab:[],et:{comp:"",silE:"",silI:"",mem:"",mou:"",opt:[],sol:""},fix:[],ann:[],ph:[]});

// ce que dit le devis pour chaque produit, gardé à la création du métré : on compare la commande à ces valeurs
const K_DEVIS=["Type","Matière","Vantaux","Sens (vue int.)","Sens d'ouverture (vue int.)","Coloris int. / ext.","Coloris int. / ext. (RAL)","Vitrage","Occultation","Produit","Type de volet roulant","Manœuvre"];
const devisDe=(p,v)=>({f:p.f,d:p.d,cote:p.cote,v:Object.fromEntries(K_DEVIS.filter(k=>v&&v[k]!==undefined&&v[k]!=="").map(k=>[k,v[k]]))});
const nb2=t=>(String(t||"").match(/\d{3,5}/g)||[]).map(Number);
function ecarts(mt){const out=[],norm=x=>String(x??"").toLowerCase().replace(/\s+/g," ").trim();
  (mt.prod||[]).forEach(p=>{const D=p.devis,it=[];
    if(p.ajout||!D){if(p.ajout)it.push({k:"ajout",l:"Produit ajouté au métré",av:"absent du devis",ap:p.d})}
    else{if(D.f!==p.f)it.push({k:"ch",l:"Famille",av:FAM[D.f]?FAM[D.f].n:D.f,ap:FAM[p.f].n});
      if(norm(D.d)!==norm(p.d))it.push({k:"ch",l:"Désignation",av:D.d,ap:p.d});
      for(const[k,v]of Object.entries(D.v||{})){const n=p.v[k];if(n!==undefined&&n!==""&&norm(n)!==norm(v))it.push({k:"ch",l:k,av:Array.isArray(v)?v.join(", "):v,ap:Array.isArray(n)?n.join(", "):n})}
      const a=nb2(D.cote),c=nb2(p.v["Cote de commande"]);if(a.length>=2&&c.length>=2&&(a[0]!==c[0]||a[1]!==c[1]))it.push({k:"dim",l:"Dimensions",av:a[0]+" × "+a[1],ap:c[0]+" × "+c[1]+" (commande)"})}
    if(it.length)out.push({r:p.r,d:p.d,items:it})});
  (mt.retires||[]).forEach(x=>out.push({r:x.r,d:x.d,items:[{k:"retire",l:"Produit retiré au métré",av:x.d+(x.cote?" · "+x.cote:""),ap:"supprimé"}]}));
  return out}
const nEcarts=mt=>ecarts(mt).reduce((n,x)=>n+x.items.length,0);
window.mtEcarts=mt=>mt?nEcarts(mt):0;
const ecartsHtml=(E,titre)=>E.length?`<section class="pp ecarts"><h2>${titre}</h2><table><thead><tr><th>Produit</th><th>Ce qui change</th><th>Devis</th><th>Métré / commande</th></tr></thead><tbody>${E.map(x=>x.items.map((i,n)=>`<tr class="e-${i.k}"><td>${n?"":`<b>${esc2(x.r||"")}</b> ${esc2(x.d||"")}`}</td><td>${esc2(i.l)}</td><td>${esc2(i.av)}</td><td><b>${esc2(i.ap)}</b></td></tr>`).join("")).join("")}</tbody></table></section>`:"";
let S=null,annot=false,crayon="Rouge";const urls=new Map();window.mtEtat=()=>S;
const ro=()=>!(canWrite||canFill);
const grps=p=>FAM[p.f].g.filter(g=>!g[2]||g[2](p.v)).map(g=>[g[0],g[1].filter(c=>!c.w||c.w(p.v))]);
const fields=p=>grps(p).flatMap(g=>g[1]);
const fait=(p,c)=>{const v=p.v[c.l];return Array.isArray(v)?v.length>0:v!==undefined&&v!==""&&v!==0};
const prog=p=>{const cs=fields(p).filter(c=>!c.opt);let a=cs.filter(c=>fait(p,c)).length,b=cs.length;
  if(ETF.includes(p.f)){b+=3;a+=(p.et.comp?1:0)+(p.et.silE?1:0)+(p.et.silI?1:0);p.hab.forEach(h=>{b++;if(h.pos&&h.p&&(h.c||h.p==="Fourni menuiserie"))a++})}
  return[a,b]};
const dims=p=>[+p.v["Tableau L"]||+p.v["Largeur entre tableaux"]||0,+p.v["Tableau H"]||+p.v["Hauteur de tableau"]||0];

// ---------- enregistrement ----------
function docOf(){const j=jobs.get(S.jid);return j&&(j.docs||[]).find(d=>d.id===S.did)}
function sched(){if(ro())return;S.dirty=true;$m("mtetat").textContent="Modifications non enregistrées…";clearTimeout(S.t);S.t=setTimeout(save,1500)}
async function save(){if(!S||!S.dirty||S.saving)return;S.saving=true;S.dirty=false;clearTimeout(S.t);
  const tot=S.mt.prod.reduce((s,p)=>{const[a,b]=prog(p);return[s[0]+a,s[1]+b]},[0,0]);
  const j=jobs.get(S.jid),docs=(j.docs||[]).map(d=>d.id===S.did?{...d,mt:S.mt,at:today(),rempli:{le:today(),reste:S.mt.prod.length?tot[1]-tot[0]:1,total:Math.max(1,tot[1])},traite:true}:d);
  try{await db.doc("chantiers/"+S.jid).update({docs});if(S){$m("mtetat").textContent="Enregistré à "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}}
  catch(e){if(S){S.dirty=true;$m("mtetat").textContent="⚠️ Pas enregistré (réseau ?) : nouvel essai dans 10 s";clearTimeout(S.t);S.t=setTimeout(save,10000)}}
  finally{if(S)S.saving=false;if(S&&S.dirty&&!S.t)sched()}}

// ---------- création, reprise des lignes du métré PDF ----------
// lecture du métré PDF pré-rempli (et éventuellement déjà rempli) : une ligne par menuiserie, puis les cases du bloc de chaque
// menuiserie (isolation, coloris, vitrage, allège, type de pose, sens, ventilation) et le jeu de pose (Steven, 23/11/2026)
async function lignesPdf(j,d0){
  const d=d0||(j.docs||[]).find(d=>d.type==="Métré"&&!d.mt&&/\.pdf$/i.test(d.name||""));if(!d||!window.PDFLib)return{prod:[],jeu:null};
  try{const r=await fetch("/_blob/"+d.id);if(!r.ok)return{prod:[],jeu:null};const doc=await PDFLib.PDFDocument.load(await r.arrayBuffer(),{ignoreEncryption:true});
    const pages=doc.getPages(),pIx=ref=>pages.findIndex(pg=>pg.ref===ref);
    const F=doc.getForm().getFields().map(f=>{const n=f.getName(),m=/^(cellule|ligne|case|posex)_(\d+)_(\d+)$/.exec(n);if(!m)return null;let v="",on=false,y=0,top=0,pi=+m[2];
      try{if(f.getText)v=(f.getText()||"").trim();if(f.isChecked)on=f.isChecked()}catch(_){}
      try{const w=f.acroField.getWidgets()[0],R=w.getRectangle();y=R.y+R.height/2;top=R.y+R.height;const P=w.P();if(P){const k=pIx(P);if(k>=0)pi=k}}catch(_){}
      return{k:m[1],p:pi,i:+m[3],v,on,y,top}}).filter(Boolean);
    const cel=F.filter(x=>x.k==="cellule").sort((a,b)=>a.p-b.p||a.i-b.i),rows=[];
    for(let k=0;k<cel.length-1;k++){const a=cel[k],b=cel[k+1];if(a.v&&!/^\d/.test(a.v)&&/^\d+\s*[×x*]\s*\d+$/.test(b.v)){rows.push({a,k});k++}}
    const prod=rows.map(({a,k},n)=>{const m=coupeRep(a.v),p=newProd(m.r,m.d,null,cel[k+1].v.replace(/\s*[x*]\s*/," × "));p.fg=1;p.src={};
      const g=q=>(cel[k+q]&&cel[k+q].p===a.p?cel[k+q].v:""),put=(key,val)=>{if(val!==""&&val!=null){p.v[key]=val;p.src[key]=val}};
      if(/^\d+$/.test(g(2)))put("Tableau L",g(2));if(/^\d+$/.test(g(3)))put("Tableau H",g(3));if(/^\d+$/.test(g(4)))put("Hors tout L",g(4));if(/^\d+$/.test(g(5)))put("Hors tout H",g(5));
      if(g(6))put("Cote de commande",g(6).replace(/\s*[x*]\s*/," × "));
      // bloc de la menuiserie : entre sa ligne et la suivante sur la même page
      const nx=rows[n+1]&&rows[n+1].a.p===a.p?rows[n+1].a.top:-1,band=F.filter(x=>x.p===a.p&&x.y<a.top+2&&x.y>nx+2&&x.k!=="cellule");
      const L=band.filter(x=>x.k==="ligne").sort((x,y)=>x.i-y.i),Cs=band.filter(x=>x.k==="case").sort((x,y)=>x.i-y.i),tun=band.some(x=>x.k==="posex"&&x.on);
      if(L.length>=5){const V=L.map(x=>x.v),[iso,col,vit,,all]=L.length>=6?[V[0],V[2],V[3],V[4],V[5]]:V;put("Épaisseur d'isolation (doublage)",/^\d+$/.test(iso)?iso:"");
        if(col)put(p.f==="porte"?"Coloris int. / ext. (RAL)":"Coloris int. / ext.",col.replace(/^Bl\.?(?=\s*\/|$)/i,"Blanc").replace(/\s*\/\s*/," / "));
        if(vit)put("Vitrage",["Double","Triple","Feuilleté","Phonique","Granité"].find(o=>o.toLowerCase()===vit.toLowerCase())||vit);
        if(+all>0)put("Hauteur d'allège",all)}
      if(Cs.length>=8){const on=Cs.map(x=>x.on);const pose=tun?"Tunnel":on[2]?"Dépose totale":on[1]?"Réno":on[0]?"Neuf applique":"";if(pose&&p.f==="fen")put("Type de pose",pose);
        const sens=on[3]?"TD":on[4]?"TG":on[5]?"Fixe":"";if(sens){if(p.f==="porte")put("Sens d'ouverture (vue int.)",sens==="TD"?"Tirant droit":sens==="TG"?"Tirant gauche":sens);else put("Sens (vue int.)",sens)}if(on[6])put("Ventilation","Aucune");if(on[7])put("Ventilation","Grille")}
      else if(tun&&p.f==="fen")put("Type de pose","Tunnel");
      preRemplir(p);p.devis=devisDe(p,p.v);return p});
    const jl=F.filter(x=>x.k==="ligne"&&x.p===0).sort((a,b)=>a.i-b.i),jc=jl[0]&&/^\d+$/.test(jl[0].v)&&+jl[0].v<30?{c:+jl[0].v,t:+(jl[1]&&jl[1].v)||+jl[0].v}:null;
    return{prod,jeu:jc}}catch(_){return{prod:[],jeu:null}}}
// métré tablette déjà créé : on complète les cases vides avec le métré PDF (sans rien écraser), une seule fois par produit
async function completePdf(){if(!S||ro())return;const j=jobs.get(S.jid);if(!j)return;const P=S.mt.prod.filter(p=>!p.pdf);if(!P.length)return;
  const{prod}=await lignesPdf(j);if(!S||!prod.length)return;let n=0;
  S.mt.prod.forEach((p,k)=>{if(p.pdf)return;const q=prod.find(x=>x.d===p.d&&x.cote===p.cote)||prod.find(x=>x.d===p.d)||(prod.length===S.mt.prod.length?prod[k]:null);p.pdf=1;if(!q)return;
    p.src=p.src||{};for(const[k2,v]of Object.entries(q.v)){if(p.v[k2]===undefined||p.v[k2]===""){p.v[k2]=v;p.src[k2]=v;n++}}
    p.devis={...q.devis,v:{...(p.devis&&p.devis.v||{}),...(q.devis&&q.devis.v||{})}}});
  sched();draw();if(n)toast(n+" informations reprises du métré PDF (coloris, vitrage, allège…) : à vérifier")}
// lignes d'un métré PDF (aussi pour la réception de support d'un chantier passé en neuf, rs.js)
window.mtLignes=(j,d)=>lignesPdf(j,d);
window.mtNew=async jid=>{const j=jobs.get(jid);if(!j)return;
  const{prod,jeu}=await lignesPdf(j);prod.forEach(p=>p.pdf=1);
  const doc={id:"mt-"+Math.random().toString(36).slice(2,12),type:"Métré",name:"Métré tablette",at:today(),by:me||"",size:0,traite:true,mt:{jeu:jeu||{c:5,t:5},prod,cree:today()},rempli:{le:today(),reste:1,total:1}};
  try{await db.doc("chantiers/"+jid).update({docs:[...(j.docs||[]),doc]});j.docs=[...(j.docs||[]),doc];mtOpen(jid,doc.id);
    toast(prod.length?prod.length+" produit"+(prod.length>1?"s repris":" repris")+" du métré PDF":"Métré créé : ajoutez les produits")}
  catch(_){toast("Création impossible : vérifiez la connexion ou vos droits.")}};

// ---------- ouverture ----------
window.mtOpen=(jid,did)=>{const j=jobs.get(jid),d=j&&(j.docs||[]).find(d=>d.id===did);if(!d)return;
  S={jid,did,mt:JSON.parse(JSON.stringify(d.mt||{jeu:{c:5,t:5},prod:[]})),cur:0,dirty:false};S.mt.prod.forEach(p=>{p.et=p.et||{opt:[]};p.et.opt=p.et.opt||[];p.hab=p.hab||[];p.fix=p.fix||[];p.ann=p.ann||[];p.ph=p.ph||[];p.v=p.v||{}});
  let rep=0;if(!ro())S.mt.prod.forEach(p=>{if(p.fg)return;const c=coupeRep(p.r+" "+p.d),f=famGuess(c.d);
    if(f!==p.f&&Object.keys(p.v).every(k=>/^(Tableau|Hors tout|Cote de commande|Type|Vantaux)/.test(k))){p.f=f;p.r=c.r;p.d=c.d;rep++}preRemplir(p);p.fg=1});
  S.mt.prod.forEach(p=>{if(!p.devis&&!p.ajout){p.devis=devisDe(p,{...(p.src||{})});S.conv=1}});
  S.mt.prod.forEach(p=>{if(p.f!=="porte")return;const o=p.v["Sens (vue int.)"];if(o&&!p.v["Sens d'ouverture (vue int.)"]){const n={TD:"Tirant droit",TG:"Tirant gauche"}[o]||o;p.v["Sens d'ouverture (vue int.)"]=n;if(p.src&&p.src["Sens (vue int.)"]){p.src["Sens d'ouverture (vue int.)"]=n}delete p.v["Sens (vue int.)"];S.conv=1}});if(S.conv&&!ro()){delete S.conv;setTimeout(sched,0)}
  if(!S.mt.prod.length)S.cur=-2;
  $m("mttitre").textContent="Métré · "+(j.client||"");$m("mtsous").textContent=[j.adresse,j.ville].filter(Boolean).join(", ");
  $m("mtov").hidden=false;$m("mtov").classList.toggle("ro",ro());document.body.style.overflow="hidden";draw();if(rep){sched();toast(rep+" produit"+(rep>1?"s reclassés":" reclassé")+" d'après le devis (volets, stores…)")}completePdf()};
window.mtClose=async()=>{if(!S)return;if(S.dirty){await save()}S=null;$m("mtov").hidden=true;document.body.style.overflow=""};

// ---------- affichage ----------
function liste(){const L=$m("mtliste");const P=S.mt.prod;
  L.innerHTML=(ro()?"":`<button type="button" class="ajout haut" data-k="-2">＋ Ajouter un élément oublié</button>`)+P.map((p,k)=>{const[a,b]=prog(p);return`<button type="button" class="it" data-k="${k}" aria-current="${k===S.cur}"><b>${esc2(p.r||"Repère à saisir")}</b><small>${esc2(FAM[p.f].n)}${p.ajout?" · ajouté":""}${(()=>{const e=ecarts({prod:[p]});return e.length&&!p.ajout?` · <b class="ecn">${e[0].items.length} écart${e[0].items.length>1?"s":""}</b>`:""})()}</small><small>${esc2(p.d)}</small><span class="jauge"><i style="width:${Math.round(100*a/Math.max(1,b))}%"></i></span><small>${a}/${b} points</small></button>`}).join("")
   +(()=>{const n=nEcarts(S.mt);return`<button type="button" class="it recap ${n?"ecart":""}" data-k="-3" aria-current="${S.cur===-3}"><b>${n?"⚠ ":""}Écarts avec le devis${n?" ("+n+")":""}</b><small>${n?"à reporter sur la commande":"aucun pour l'instant"}</small></button>`})()+`<button type="button" class="it recap" data-k="-1" aria-current="${S.cur===-1}"><b>Consommables du chantier</b><small>Totaux calculés</small></button>`+(ro()?"":`<button type="button" class="ajout" data-k="-2">+ Ajouter un produit</button>`);
  L.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{S.cur=+b.dataset.k;draw();$m("mtfiche").scrollTop=0});
  const t=P.reduce((s,p)=>{const[a,b]=prog(p);return[s[0]+a,s[1]+b]},[0,0]);$m("mtglob").textContent=`${t[0]}/${t[1]} points relevés`}
function draw(){liste();const f=$m("mtfiche");f.innerHTML="";$m("mtjc").value=S.mt.jeu.c;$m("mtjt").value=S.mt.jeu.t;
  if(S.cur===-3){const E=ecarts(S.mt);f.innerHTML=`<div class="ftete"><h2>Écarts avec le devis</h2></div><p class="sub">Tout ce que le métré change par rapport au devis : à reporter sur la commande avant de valider l'ARC. Toute différence de dimension entre la cote du devis et la cote de commande est signalée, même d'un millimètre.</p>${E.length?`<div class="mtlire">${ecartsHtml(E,"")}</div>`:`<p class="sub">Aucun écart pour l'instant.</p>`}`;return}
  if(S.cur===-1){recap(f);return}if(S.cur===-2||!S.mt.prod[S.cur]){ajout(f);return}
  const p=S.mt.prod[S.cur];
  const t=document.createElement("div");t.className="ftete";
  t.innerHTML=`<label class="ch"><span>Repère</span><input type="text" data-x="r" value="${esc2(p.r)}"></label><label class="ch"><span>Désignation</span><input type="text" data-x="d" value="${esc2(p.d)}"></label><label class="ch"><span>Famille</span><select class="sel" data-x="f">${Object.entries(FAM).map(([k,F])=>`<option value="${k}" ${k===p.f?"selected":""}>${esc2(F.n)}</option>`).join("")}</select></label><label class="ch"><span>Cote devis</span><input type="text" data-x="cote" value="${esc2(p.cote)}"></label>`;
  t.querySelectorAll("[data-x]").forEach(e=>{const k=e.dataset.x;e.oninput=e.onchange=()=>{p[k]=e.value;sched();if(k==="f")draw();else liste()}});f.appendChild(t);
  {const E=ecarts({prod:[p]});if(E.length){const b=document.createElement("div");b.className="alerte";b.innerHTML="<b>Différent du devis :</b> "+E[0].items.map(i=>esc2(i.l)+" : "+esc2(i.av)+" → <b>"+esc2(i.ap)+"</b>").join(" · ");f.appendChild(b)}}
  grps(p).forEach(([titre,cs])=>{const g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>${esc2(titre)}</h3>`;const d=document.createElement("div");d.className="champs";cs.forEach(c=>d.appendChild(champ(p,c)));g.appendChild(d);f.appendChild(g)});
  if(ETF.includes(p.f)){f.appendChild(habBloc(p));f.appendChild(coupeBloc(p));f.appendChild(etBloc(p))}
  f.appendChild(fixBloc(p));if(!ETF.includes(p.f))f.appendChild(coupeBloc(p));
  f.appendChild(photoBloc(p));
  if(!ro()){const z=document.createElement("div");z.className="acts";z.innerHTML=`<button type="button" class="b2" data-a="dup">Dupliquer ce produit</button><button type="button" class="b2 rouge" data-a="del">Supprimer ce produit</button>`;
    z.querySelector('[data-a="dup"]').onclick=()=>{const c=JSON.parse(JSON.stringify(p));c.k=Math.random().toString(36).slice(2,9);c.ann=[];c.ph=[];c.r=p.r+" (copie)";S.mt.prod.splice(S.cur+1,0,c);S.cur++;sched();draw();$m("mtfiche").scrollTop=0};
    z.querySelector('[data-a="del"]').onclick=()=>{if(!confirm("Supprimer « "+(p.r||p.d)+" » du métré ?"))return;if(!p.ajout)(S.mt.retires=S.mt.retires||[]).push({r:p.r,d:p.d,cote:p.cote,le:today()});S.mt.prod.splice(S.cur,1);S.cur=Math.min(S.cur,S.mt.prod.length-1);if(S.cur<0)S.cur=-2;sched();draw()};f.appendChild(z)}}
function champ(p,c){const w=document.createElement("div");w.className="ch"+(c.t==="t"&&/^Accès|Façade|Pignons/.test(c.l)?" large":"")+(!c.opt&&!fait(p,c)?" vide":"");w.innerHTML=`<span>${esc2(c.l)}${c.opt?' <small>(si besoin)</small>':""}</span>${c.h?`<small class="sub">${esc2(c.h)}</small>`:""}`;
  const set=v=>{p.v[c.l]=v;if(p.src)delete p.src[c.l];w.classList.remove("prop");sched();liste()};
  if(c.t==="mm"){const d=document.createElement("div");d.className="mm";const i=document.createElement("input");i.type="text";i.inputMode="numeric";i.value=p.v[c.l]||"";i.setAttribute("aria-label",c.l);
    i.oninput=()=>{set(i.value.replace(/\D/g,""));i.value=p.v[c.l];w.classList.toggle("vide",!c.opt&&!i.value)};i.onchange=()=>redraw();d.append(i,Object.assign(document.createElement("em"),{textContent:"mm"}));w.appendChild(d)}
  if(c.t==="tri"){const k=c.l+" · mesures",arr=(p.v[k]||["","",""]).slice(),d=document.createElement("div");d.className="tri";
    c.sub.forEach((sb,n)=>{const z=document.createElement("label");z.innerHTML=`<small>${esc2(sb)}</small>`;const m=document.createElement("div");m.className="mm";const i=document.createElement("input");i.type="text";i.inputMode="numeric";i.value=arr[n]||"";i.setAttribute("aria-label",c.l+" "+sb);
      i.oninput=()=>{arr[n]=i.value.replace(/\D/g,"");i.value=arr[n];p.v[k]=arr.slice();const ok=arr.filter(Boolean).map(Number);p.v[c.l]=ok.length?String(Math.min(...ok)):"";h.innerHTML=ok.length?`Retenue (la plus petite) : <b>${p.v[c.l]} mm</b>`:"3 mesures, la plus petite est retenue";w.classList.toggle("vide",!c.opt&&!ok.length);sched();liste()};
      i.onchange=()=>redraw();m.append(i,Object.assign(document.createElement("em"),{textContent:"mm"}));z.appendChild(m);d.appendChild(z)});
    const h=document.createElement("small");h.className="sub";const ok=arr.filter(Boolean);h.innerHTML=ok.length?`Retenue (la plus petite) : <b>${p.v[c.l]} mm</b>`:"3 mesures, la plus petite est retenue";w.append(d,h);w.classList.add("large")}
  if(c.t==="t"){const i=document.createElement("input");i.type="text";i.value=p.v[c.l]||"";i.setAttribute("aria-label",c.l);i.oninput=()=>{set(i.value);w.classList.toggle("vide",!c.opt&&!i.value)};w.appendChild(i)}
  if(c.t==="cmd"){const L=+p.v["Tableau L"],H=+p.v["Tableau H"],J=S.mt.jeu,prop=L&&H?`${L-2*J.c} × ${H-J.t}`:"";const i=document.createElement("input");i.type="text";i.value=p.v[c.l]||"";i.placeholder=prop||"L × H";i.setAttribute("aria-label",c.l);
    i.oninput=()=>{set(i.value);w.classList.toggle("vide",!i.value)};const h=document.createElement("small");h.className="sub";h.dataset.cmdh="1";
    h.innerHTML=prop?`Calcul : tableau − ${J.c} mm par côté, − ${J.t} mm en tête = <b>${prop}</b> `:"Saisissez le tableau pour avoir le calcul";
    if(prop&&!ro()&&p.v[c.l]!==prop){const b=document.createElement("button");b.type="button";b.className="b2 mini";b.textContent="Reprendre";b.onclick=()=>{set(prop);draw()};h.appendChild(b)}w.append(i,h)}
  if(c.t==="n"){const d=document.createElement("div");d.className="pas";const v=()=>+p.v[c.l]||0;d.innerHTML=`<button type="button" aria-label="moins">−</button><b>${v()||"–"}</b><button type="button" aria-label="plus">+</button>`;const[m,,pl]=d.children;m.onclick=()=>{set(Math.max(0,v()-1)||"");draw()};pl.onclick=()=>{set(v()+1);draw()};w.appendChild(d)}
  if(c.t==="c"||c.t==="m"){const d=document.createElement("div");d.className="seg";c.o.forEach(o=>{const b=document.createElement("button");b.type="button";b.textContent=o;const on=c.t==="m"?(p.v[c.l]||[]).includes(o):p.v[c.l]===o;b.setAttribute("aria-pressed",on);
    b.onclick=()=>{if(c.t==="m"){const a=new Set(p.v[c.l]||[]);a.has(o)?a.delete(o):a.add(o);set([...a])}else set(p.v[c.l]===o?"":o);draw()};d.appendChild(b)});w.appendChild(d);
    if(c.t==="c")autre(w,d,c.o,()=>p.v[c.l]||"",v=>set(v));else autreM(w,()=>p.v[c.l+" (autre)"]||"",v=>{p.v[c.l+" (autre)"]=v;sched()})}
  if(p.src&&p.src[c.l]!==undefined&&JSON.stringify(p.src[c.l])===JSON.stringify(p.v[c.l]))w.classList.add("prop");
  return w}
// bouton « Autre… » : une case pour écrire soi-même (RAL, référence, produit non répertorié) ; la valeur tapée remplace le choix
function autre(w,d,opts,get,set){const v=get(),perso=v&&!opts.includes(v),b=document.createElement("button");b.type="button";b.textContent=perso?"Autre : "+v:"Autre…";b.setAttribute("aria-pressed",!!perso);d.appendChild(b);
  const i=document.createElement("input");i.type="text";i.placeholder="Écrire (RAL, référence, autre choix…)";i.value=perso?v:"";i.hidden=!perso;i.className="autre";w.appendChild(i);
  b.onclick=()=>{i.hidden=false;i.focus()};i.oninput=()=>{set(i.value.trim());b.textContent=i.value.trim()?"Autre : "+i.value.trim():"Autre…";b.setAttribute("aria-pressed",!!i.value.trim());d.querySelectorAll("button").forEach(x=>{if(x!==b)x.setAttribute("aria-pressed","false")})}}
function autreM(w,get,set){const i=document.createElement("input");i.type="text";i.className="autre";i.placeholder="Autre (écrire)…";i.value=get();i.oninput=()=>set(i.value.trim());w.appendChild(i)}
function sel(opts,val,lab,on){const e=document.createElement("select");e.className="sel";e.setAttribute("aria-label",lab);e.innerHTML=`<option value="">${esc2(lab)}…</option>`+opts.map(o=>`<option ${o===val?"selected":""}>${esc2(o)}</option>`).join("");e.onchange=()=>on(e.value);return e}
function segIn(lab,opts,get,setv,multi,getA,setA,oblig){const w=document.createElement("div");w.className="ch"+(oblig&&!get()?" vide":"");w.innerHTML=`<span>${esc2(lab)}</span>`;const d=document.createElement("div");d.className="seg";
  opts.forEach(o=>{const b=document.createElement("button");b.type="button";b.textContent=o;const v=get()||(multi?[]:"");b.setAttribute("aria-pressed",multi?v.includes(o):v===o);b.onclick=()=>{if(multi){const a=new Set(get()||[]);a.has(o)?a.delete(o):a.add(o);setv([...a])}else setv(get()===o?"":o);sched();draw()};d.appendChild(b)});w.appendChild(d);
  if(!multi)autre(w,d,opts,()=>get()||"",v=>{setv(v);sched()});else if(getA)autreM(w,getA,v=>{setA(v);sched()});return w}
function habBloc(p){const g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>Habillages</h3><p class="sub">Autant de lignes que nécessaire : plats et cornières de dimensions et de coloris différents. La longueur est calculée sur le tableau.</p>`;
  const[L,H]=dims(p);
  p.hab.forEach((h,k)=>{const r=document.createElement("div");r.className="hl";const ml=L&&H&&HAB_POS[h.pos]?HAB_POS[h.pos](L,H):0;
    r.append(sel(Object.keys(HAB_POS),h.pos,"Position",v=>{h.pos=v;sched();draw()}),sel([...HAB_PROF,"Autre profil"],h.p,"Profil",v=>{h.p=v;sched();draw()}),sel(HAB_COLS,h.c,"Coloris",v=>{h.c=v;sched();draw()}));
    const m=document.createElement("span");m.className="ml";m.textContent=ml?mlf(ml):"–";const x=document.createElement("button");x.type="button";x.className="x";x.textContent="×";x.setAttribute("aria-label","Retirer cet habillage");x.onclick=()=>{p.hab.splice(k,1);sched();draw()};r.append(m,x);g.appendChild(r);
    if(h.p==="Autre profil"){const i=document.createElement("input");i.type="text";i.className="autre";i.placeholder="Profil : ex. cornière 25×45, plat 120, tôle pliée en Z…";i.value=h.pa||"";i.oninput=()=>{h.pa=i.value;sched()};g.appendChild(i)}
    if(h.c==="Autre RAL"){const i=document.createElement("input");i.type="text";i.className="autre";i.placeholder="RAL ou référence du coloris (ex. RAL 7022 sablé, HM819)";i.value=h.r||"";i.oninput=()=>{h.r=i.value;sched()};g.appendChild(i)}});
  const a=document.createElement("button");a.type="button";a.className="plus";a.textContent="+ Ajouter un habillage";a.onclick=()=>{p.hab.push({pos:"",p:"",c:"",r:""});sched();draw()};g.appendChild(a);return g}
function etBloc(p){const e=p.et,g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>Étanchéité et options de pose</h3>`;const d=document.createElement("div");d.className="champs";
  d.append(segIn("Compribande",[...Object.keys(COMP),"Aucune"],()=>e.comp,v=>e.comp=v,false,null,null,true),segIn("Silicone extérieur : teinte",SIL,()=>e.silE,v=>e.silE=v,false,null,null,true),segIn("Silicone intérieur",["Blanc","Idem ext.","Aucun"],()=>e.silI,v=>e.silI=v,false,null,null,true),
    segIn("Mousse PU",["Normale","Coupe-feu","Aucune"],()=>e.mou,v=>e.mou=v),segIn("Membrane",["Aucune","ME111","ME220","Techpro intérieure"],()=>e.mem,v=>e.mem=v),
    segIn("Options",["Création de rejingot","Délignage des cochonnets","Modification du sol intérieur"],()=>e.opt,v=>e.opt=v,true,()=>e.optA||"",v=>e.optA=v));
  g.appendChild(d);
  if((e.opt||[]).includes("Modification du sol intérieur")){const w=document.createElement("div");w.className="ch";w.innerHTML="<span>Hauteur de modification du sol</span>";const m=document.createElement("div");m.className="mm";const i=document.createElement("input");i.type="text";i.inputMode="numeric";i.value=e.sol||"";i.oninput=()=>{e.sol=i.value.replace(/\D/g,"");i.value=e.sol;sched()};m.append(i,Object.assign(document.createElement("em"),{textContent:"mm"}));w.appendChild(m);g.appendChild(w)}
  return g}
function fixBloc(p){const g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>Fixations</h3>`;
  p.fix.forEach((v,k)=>{const r=document.createElement("div");r.className="hl";if(v.t==="Autre")setTimeout(()=>{const i=document.createElement("input");i.type="text";i.className="autre";i.placeholder="Quelle fixation ? (référence, longueur)";i.value=v.ta||"";i.oninput=()=>{v.ta=i.value;sched()};r.after(i)});const q=document.createElement("input");q.type="text";q.inputMode="numeric";q.placeholder="Qté";q.value=v.q||"";q.setAttribute("aria-label","Quantité");q.oninput=()=>{v.q=q.value.replace(/\D/g,"");q.value=v.q;sched()};
    const x=document.createElement("button");x.type="button";x.className="x";x.textContent="×";x.setAttribute("aria-label","Retirer");x.onclick=()=>{p.fix.splice(k,1);sched();draw()};
    r.append(sel(Object.keys(VIS),v.t,"Type",t=>{v.t=t;v.l=String((VIS[t]||[""])[0]);sched();draw()}),sel((VIS[v.t]||[]).map(n=>n==="—"?"—":n+" mm"),v.l==="—"?"—":v.l+" mm","Longueur",l=>{v.l=l.replace(" mm","");sched()}),q,document.createElement("span"),x);g.appendChild(r)});
  const a=document.createElement("button");a.type="button";a.className="plus";a.textContent="+ Ajouter une fixation";a.onclick=()=>{p.fix.push({t:"Vis béton",l:"80",q:""});sched();draw()};g.appendChild(a);return g}
function photoBloc(p){const g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>Photos et remarques</h3>`;const ph=document.createElement("div");ph.className="photo";
  if(!ro()){const l=document.createElement("label");l.textContent="📷 Photo";const i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=true;i.hidden=true;
    const envoi=async fs=>{for(const fl of fs){try{const b=await shrink(fl,3000,.88);const r=await assets.upload(new File([b],"metre-"+(p.r||"photo")+".jpg",{type:"image/jpeg"}));p.ph.push(r.id);sched();draw()}catch(_){toast("Photo non envoyée (réseau ?)")}}};
    i.onchange=()=>{const fs=[...i.files];i.value="";envoi(fs)};l.appendChild(i);
    l.addEventListener("click",e=>{if(e.target===i||!window.appCam)return;e.preventDefault();appCam(envoi,{titre:"Photos · "+(p.r||p.d||"produit"),repli:()=>i.click()})});
    const g=document.createElement("label");g.className="sub";g.innerHTML="ou <u>choisir dans la galerie</u>";const gi=document.createElement("input");gi.type="file";gi.accept="image/*";gi.multiple=true;gi.hidden=true;gi.onchange=()=>{const fs=[...gi.files];gi.value="";envoi(fs)};g.appendChild(gi);ph.append(l,g)}
  p.ph.forEach(id=>{const a=document.createElement("a");a.href="#";a.className="th";const im=new Image();im.alt="Photo "+(p.r||"");a.appendChild(im);
    const show=u=>{im.src=u;a.onclick=e=>{e.preventDefault();window.open(u,"_blank")}};if(urls.has(id))show(urls.get(id));else window.sbClient.storage.from("documents").createSignedUrl(id,3600).then(({data})=>{if(data){urls.set(id,data.signedUrl);show(data.signedUrl)}});ph.appendChild(a)});
  const rq=document.createElement("textarea");rq.placeholder="Remarque pour la commande ou pour les poseurs";rq.value=p.v.rem||"";rq.oninput=()=>{p.v.rem=rq.value;sched()};g.append(ph,rq);return g}

// ---------- coupes de principe : les habillages se dessinent à leur place ----------
function couvre(pos){const s=/ext/.test(pos||"")?"e":"i";if(/^Tour/.test(pos))return["m"+s,"h"+s];if(/^Montants/.test(pos))return["m"+s];if(/^Haut/.test(pos))return["h"+s];if(/^Bas/.test(pos))return["b"+s];return[]}
const GEO={he:{c:d=>`${118-d},${117-d} ${147-d},${117-d} ${147-d},142`,pl:d=>`112,${117-d} 150,${117-d}`,lx:12,ly:150,hx:135,hy:132},
 be:{c:d=>`${118-d},${323+d} ${147-d},${323+d} ${147-d},298`,pl:d=>`112,${323+d} 150,${323+d}`,lx:12,ly:282,hx:135,hy:308},
 hi:{c:d=>`${202+d},${117-d} ${177+d},${117-d} ${177+d},142`,pl:d=>`174,${117-d} 206,${117-d}`,lx:208,ly:150,hx:190,hy:132},
 bi:{c:d=>`${202+d},${323+d} ${177+d},${323+d} ${177+d},298`,pl:d=>`174,${323+d} 206,${323+d}`,lx:208,ly:282,hx:190,hy:308},
 me:{c:d=>`${137-d},92 ${137-d},${125-d} 168,${125-d}`,pl:d=>`${137-d},88 ${137-d},128`,lx:180,ly:70,hx:122,hy:110},
 mi:{c:d=>`${137-d},206 ${137-d},${153+d} 168,${153+d}`,pl:d=>`${137-d},152 ${137-d},206`,lx:180,ly:205,hx:122,hy:178}};
const habProf=h=>h.p==="Autre profil"?(h.pa||"profil à préciser"):(h.p||"profil ?"),habCol=h=>h.c==="Autre RAL"?(h.r||"RAL ?"):(h.c||"coloris ?");
function trace(p,keys,plus){const par={};p.hab.forEach(h=>couvre(h.pos).forEach(sp=>{(par[sp]=par[sp]||[]).push(h)}));let o="";
  keys.forEach(sp=>{const G=GEO[sp],hs=par[sp]||[];
    hs.forEach((h,n)=>{const d=n*6,pts=/^Plat/.test(h.p)?G.pl(d):G.c(d),hk=p.hab.indexOf(h);
      const t=habProf(h).replace(/^Cornière |^Plat /,"")+" · "+habCol(h);
      o+=`<g class="hh"${plus?` tabindex="0" role="button" aria-label="Modifier l'habillage ${esc2(h.pos||"")}"`:""} data-hk="${hk}" data-sp="${sp}"><polyline points="${pts}" fill="none" stroke="#1f5fbf" stroke-width="4.5"/><polyline points="${pts}" fill="none" stroke="transparent" stroke-width="16"/><text x="${G.lx}" y="${G.ly+n*14}" font-size="10.5" font-weight="700" fill="#1f5fbf">${esc2(t)}</text></g>`});
    if(!hs.length&&plus)o+=`<g class="hs" tabindex="0" role="button" data-sp="${sp}" aria-label="Ajouter un habillage ${SPOT[sp]}"><circle cx="${G.hx}" cy="${G.hy}" r="11" fill="#fff" stroke="#9aa3b0" stroke-dasharray="3 2"/><text x="${G.hx}" y="${G.hy+5}" text-anchor="middle" font-size="16" fill="#566070">+</text></g>`});return o}
const HACH=id=>`<defs><pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#9aa3b0" stroke-width="1.2"/></pattern></defs>`;
function svgV(p,plus,u){const reno=/Réno/.test(p.v["Type de pose"]||p.v["Dormant"]||""),iso=+p.v["Épaisseur d'isolation (doublage)"]||0;
  if(p.f==="porte"||porteF(p.v))return svgVPorte(p,plus,u,reno,iso);
  return`<svg viewBox="0 0 320 440" role="img" aria-label="Coupe verticale">${HACH("hv"+u)}<text x="14" y="18" font-size="11" font-weight="700" fill="#566070">EXT.</text><text x="280" y="18" font-size="11" font-weight="700" fill="#566070">INT.</text>
  <rect x="40" y="26" width="130" height="90" fill="url(#hv${u})" stroke="#10407e"/>${iso?`<rect x="170" y="26" width="28" height="90" fill="#f3e6a6" stroke="#10407e"/><text x="184" y="70" font-size="9" text-anchor="middle" fill="#566070" transform="rotate(-90 184 70)">doublage ${iso}</text>`:""}
  ${reno?`<rect x="143" y="116" width="9" height="208" fill="#d9c7a5" stroke="#8a7350"/>`:""}<rect x="${reno?152:148}" y="116" width="22" height="208" fill="#7d8794"/><line x1="${reno?163:159}" y1="132" x2="${reno?163:159}" y2="308" stroke="#7fb0e0" stroke-width="3"/>
  <rect x="40" y="324" width="130" height="100" fill="url(#hv${u})" stroke="#10407e"/>${iso?`<rect x="170" y="324" width="28" height="100" fill="#f3e6a6" stroke="#10407e"/>`:""}<polygon points="10,330 40,324 40,334 10,338" fill="#c9d1dc"/>
  ${reno?`<text x="60" y="436" font-size="9" fill="#8a7350">beige : ancien dormant conservé (réno)</text>`:""}${trace(p,["he","be","hi","bi"],plus)}</svg>`}
// porte d'entrée, porte-fenêtre, coulissant : la menuiserie descend jusqu'au sol, seuil, rejingot, futur sol à déduire
function svgVPorte(p,plus,u,reno,iso){const v=p.v,fs=futur(v),ep=+v["Épaisseur du futur sol"]||0,rej=v["Rejingot / appui extérieur"],hab=v["Habillage du seuil"],seuil=v["Seuil"]||"à préciser";
  const yS=fs?312:324,x0=reno?152:148;
  return`<svg viewBox="0 0 320 440" role="img" aria-label="Coupe verticale">${HACH("hv"+u)}<text x="14" y="18" font-size="11" font-weight="700" fill="#566070">EXT.</text><text x="280" y="18" font-size="11" font-weight="700" fill="#566070">INT.</text>
  <rect x="40" y="26" width="130" height="90" fill="url(#hv${u})" stroke="#10407e"/>${iso?`<rect x="170" y="26" width="28" height="90" fill="#f3e6a6" stroke="#10407e"/><text x="184" y="70" font-size="9" text-anchor="middle" fill="#566070" transform="rotate(-90 184 70)">doublage ${iso}</text>`:""}
  ${reno?`<rect x="143" y="116" width="9" height="${yS-122}" fill="#d9c7a5" stroke="#8a7350"/>`:""}<rect x="${x0}" y="116" width="22" height="${yS-122}" fill="#7d8794"/><line x1="${x0+11}" y1="132" x2="${x0+11}" y2="${yS-16}" stroke="#7fb0e0" stroke-width="3"/>
  <rect x="${x0-4}" y="${yS-6}" width="30" height="6" fill="#566070"/>${T_(x0-6,yS-12,"seuil : "+(seuil).toLowerCase(),'text-anchor="end" font-weight="700"')}
  <rect x="10" y="330" width="300" height="94" fill="url(#hv${u})" stroke="#10407e"/>${T_(180,414,"dalle")}
  <rect x="170" y="324" width="140" height="6" fill="#c9d1dc"/>${fs?`<rect x="170" y="${324-Math.max(8,Math.min(24,ep/4))}" width="140" height="${Math.max(8,Math.min(24,ep/4))}" fill="#f6e7c8" stroke="#c96a2c" stroke-dasharray="4 3"/>${T_(200,306,"futur sol "+(ep?ep+" mm":"?")+(v["Sol à déduire de la hauteur"]==="Oui"?" · à déduire":""),'fill="#c96a2c" font-weight="700"')}`:T_(200,320,"sol fini int.")}
  <rect x="10" y="${rej==="À créer"?316:324}" width="${x0-14}" height="${rej==="À créer"?14:6}" fill="${rej==="À créer"?"#fbe3d3":"#c9d1dc"}" stroke="${rej==="À créer"?"#c96a2c":"none"}" ${rej==="À créer"?'stroke-dasharray="4 3"':""}/>${T_(14,rej==="À créer"?310:318,rej==="À créer"?"rejingot à créer":rej==="Existant"?"rejingot existant":"sol ext.")}
  ${hab&&hab!=="Aucun"?`<polyline points="${x0-18},${yS+1} ${x0-2},${yS+1} ${x0-2},${yS-14}" fill="none" stroke="#1f5fbf" stroke-width="4.5"/>${T_(16,yS+22,"habillage seuil : "+hab.toLowerCase(),'fill="#1f5fbf" font-weight="700"')}`:""}
  ${reno?`<text x="60" y="436" font-size="9" fill="#8a7350">beige : ancien dormant conservé (réno)</text>`:""}${trace(p,["he","hi"],plus)}</svg>`}
function svgH(p,plus,u){const reno=/Réno/.test(p.v["Type de pose"]||p.v["Dormant"]||""),iso=+p.v["Épaisseur d'isolation (doublage)"]||0;
  return`<svg viewBox="0 0 320 300" role="img" aria-label="Coupe horizontale">${HACH("hh"+u)}<text x="280" y="22" font-size="11" font-weight="700" fill="#566070">EXT.</text><text x="280" y="290" font-size="11" font-weight="700" fill="#566070">INT.</text>
  <rect x="20" y="40" width="120" height="${iso?110:150}" fill="url(#hh${u})" stroke="#10407e"/>${iso?`<rect x="20" y="150" width="120" height="50" fill="#f3e6a6" stroke="#10407e"/><text x="80" y="180" font-size="9" text-anchor="middle" fill="#566070">doublage ${iso}</text>`:""}
  ${reno?`<rect x="140" y="118" width="34" height="9" fill="#d9c7a5" stroke="#8a7350"/>`:""}<rect x="140" y="127" width="34" height="24" fill="#7d8794"/><line x1="174" y1="139" x2="312" y2="139" stroke="#7fb0e0" stroke-width="3"/>${trace(p,["me","mi"],plus)}</svg>`}
// les annotations sont gardées en coordonnées relatives (0 à 1) d'un cadre de proportions fixes : même dessin à l'écran et à l'impression
// ---------- croquis propres à chaque produit (volets, stores, garage, portail) ----------
const mmv=(v,k)=>v[k]?v[k]+" mm":"…";
const DEFS=u=>`<defs><pattern id="hz${u}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#9aa3b0" stroke-width="1.2"/></pattern><pattern id="tl${u}" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r=".9" fill="#7d8794"/></pattern><marker id="fl${u}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#10407e"/></marker></defs>`;
const coteH=(u,x1,x2,y,t)=>`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#10407e" marker-start="url(#fl${u})" marker-end="url(#fl${u})"/><text x="${(x1+x2)/2}" y="${y+13}" font-size="11" font-weight="700" text-anchor="middle" fill="#10407e">${esc2(t)}</text>`;
const coteV=(u,x,y1,y2,t)=>`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#10407e" marker-start="url(#fl${u})" marker-end="url(#fl${u})"/><text x="${x+5}" y="${(y1+y2)/2}" font-size="11" font-weight="700" fill="#10407e" transform="rotate(90 ${x+5} ${(y1+y2)/2})" text-anchor="middle">${esc2(t)}</text>`;
const T_=(x,y,t,o="")=>`<text x="${x}" y="${y}" font-size="10" fill="#566070" ${o}>${esc2(t)}</text>`;
const motor=v=>/Moteur|Radio|Solaire/.test(v["Manœuvre"]||"");
function manoeuvre(v,xg,xd,y){const c=v["Côté de manœuvre (vue int.)"],x=c==="Gauche"?xg:c==="Droite"?xd:null,a=v["Alimentation électrique"]||"";let o="";
  if(x!=null){if(motor(v))o+=`<circle cx="${x}" cy="${y}" r="9" fill="#c96a2c"/><text x="${x}" y="${y+4}" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">M</text>`;
    else if(/Sangle/.test(v["Manœuvre"]||""))o+=`<line x1="${x}" y1="${y}" x2="${x}" y2="${y+110}" stroke="#c96a2c" stroke-width="3"/><rect x="${x-5}" y="${y+110}" width="10" height="16" fill="#c96a2c"/>`;
    else if(/Treuil/.test(v["Manœuvre"]||""))o+=`<line x1="${x}" y1="${y}" x2="${x}" y2="${y+120}" stroke="#c96a2c" stroke-width="2.5"/><path d="M${x} ${y+120} h10" stroke="#c96a2c" stroke-width="3"/>`;
    o+=T_(160,318,"manœuvre : "+(v["Manœuvre"]||"?").toLowerCase()+", côté "+c.toLowerCase()+" (vue int.)",'text-anchor="middle" font-weight="700" fill="#c96a2c"')}
  if(/gauche|droite/.test(a)){const xa=/gauche/.test(a)?xg:xd;o+=`<text x="${xa}" y="${y+70}" font-size="18" text-anchor="middle">⚡</text>`+T_(xa,y+86,"alim.",'text-anchor="middle" font-weight="700"')}
  return o}
function svgOccFace(p,u){const v=p.v,pr=v["Produit"]||"Volet roulant",L=mmv(v,"Largeur entre tableaux"),H=mmv(v,"Hauteur de tableau"),t=v["Taille du coffre"];
  const mur=`<rect x="16" y="14" width="288" height="22" fill="url(#hz${u})" stroke="#10407e"/><rect x="16" y="36" width="40" height="240" fill="url(#hz${u})" stroke="#10407e"/><rect x="264" y="36" width="40" height="240" fill="url(#hz${u})" stroke="#10407e"/><rect x="44" y="274" width="232" height="8" fill="#c9d1dc"/>`;
  if(bat(v)){const n=Math.max(1,+v["Vantaux"]||2),w=208/n,mod=v["Modèle"]||"";let o=mur+`<rect x="56" y="36" width="208" height="238" fill="#e6f0fa"/>`;
    for(let k=0;k<n;k++){const x=56+k*w;o+=`<rect x="${x+1}" y="38" width="${w-2}" height="234" fill="#eef1f5" stroke="#10407e"/>`;
      if(/Persienn/.test(mod))for(let y=46;y<268;y+=8)o+=`<line x1="${x+5}" y1="${y}" x2="${x+w-5}" y2="${y}" stroke="#8a96a8"/>`;
      else{for(let xx=x+9;xx<x+w-4;xx+=10)o+=`<line x1="${xx}" y1="40" x2="${xx}" y2="270" stroke="#c9d1dc"/>`;o+=`<rect x="${x+4}" y="62" width="${w-8}" height="7" fill="#8a96a8"/><rect x="${x+4}" y="232" width="${w-8}" height="7" fill="#8a96a8"/>`;if(/écharpe/.test(mod))o+=`<line x1="${x+6}" y1="232" x2="${x+w-6}" y2="69" stroke="#8a96a8" stroke-width="6"/>`}
      const xg=k<n/2?x+2:x+w-2,hs=(+v["Hauteur de tableau"]||0)>1600?[65,150,236]:[65,236];hs.forEach(y=>o+=`<rect x="${xg-4}" y="${y-2}" width="8" height="10" fill="#1d2633"/>`)}
    o+=T_(160,30,"vue de l'extérieur · gonds en noir",'text-anchor="middle"')+(v["Arrêts"]?T_(36,296,"arrêts : "+v["Arrêts"].toLowerCase()):"");
    return`<svg viewBox="0 0 320 320" role="img" aria-label="Vue de face">${DEFS(u)}${o}${coteH(u,56,264,288,"L "+L)}${coteV(u,310,36,274,"H "+H)}</svg>`}
  let o=mur+`<rect x="56" y="36" width="208" height="238" fill="#e6f0fa"/><line x1="160" y1="70" x2="160" y2="274" stroke="#9aa3b0"/>`;
  if(!bso(v)){o+=`<rect x="56" y="36" width="208" height="34" fill="#d6dbe3" stroke="#10407e"/><text x="160" y="57" font-size="11" font-weight="700" text-anchor="middle" fill="#10407e">coffre ${esc2(t||"?")}</text>`;
    o+=`<rect x="56" y="70" width="9" height="204" fill="#aab4c2"/><rect x="255" y="70" width="9" height="204" fill="#aab4c2"/>`}
  if(zip(v))o+=`<rect x="65" y="70" width="190" height="120" fill="url(#tl${u})" opacity=".8"/><rect x="65" y="188" width="190" height="5" fill="#566070"/>`;
  else if(bso(v)){const cab=v["Guidage"]==="Câbles";o+=`<rect x="56" y="36" width="208" height="16" fill="#d6dbe3" stroke="#10407e"/>`+(cab?`<line x1="62" y1="52" x2="62" y2="274" stroke="#566070"/><line x1="258" y1="52" x2="258" y2="274" stroke="#566070"/>`:`<rect x="56" y="52" width="9" height="222" fill="#aab4c2"/><rect x="255" y="52" width="9" height="222" fill="#aab4c2"/>`);
    for(let y=58;y<200;y+=9)o+=`<line x1="66" y1="${y}" x2="254" y2="${y+3}" stroke="#7d8794" stroke-width="4"/>`}
  else{for(let y=72;y<170;y+=7)o+=`<line x1="65" y1="${y}" x2="255" y2="${y}" stroke="#8a96a8"/>`;o+=`<rect x="65" y="168" width="190" height="5" fill="#566070"/>`}
  o+=T_(160,10,"vue de l'intérieur",'text-anchor="middle"')+manoeuvre(v,36,284,88);
  return`<svg viewBox="0 0 320 320" role="img" aria-label="Vue de face">${DEFS(u)}${o}${coteH(u,56,264,284,"L "+L)}${coteV(u,310,36,274,"H "+H)}</svg>`}
function svgOccCoupe(p,u){const v=p.v,t=tv(v),pos=v["Position du coffre"]||"",taille=v["Taille du coffre"]||"?";
  let lin=`<rect x="70" y="20" width="130" height="70" fill="url(#hz${u})" stroke="#10407e"/>`,fen=[150,90,240],cof=null,cou=null,lab="";
  if(bat(v)){return`<svg viewBox="0 0 320 300" role="img" aria-label="Vue de dessus">${DEFS(u)}${T_(160,14,"vue de dessus",'text-anchor="middle"')}${T_(10,40,"EXT.")}${T_(285,290,"INT.")}
    <rect x="20" y="120" width="70" height="90" fill="url(#hz${u})" stroke="#10407e"/><rect x="230" y="120" width="70" height="90" fill="url(#hz${u})" stroke="#10407e"/><line x1="0" y1="120" x2="320" y2="120" stroke="#10407e" stroke-dasharray="2 3"/>
    <rect x="90" y="180" width="140" height="10" fill="#7d8794"/><line x1="92" y1="128" x2="158" y2="128" stroke="#10407e" stroke-width="5" stroke-dasharray="5 3"/><line x1="162" y1="128" x2="228" y2="128" stroke="#10407e" stroke-width="5" stroke-dasharray="5 3"/>
    <line x1="88" y1="116" x2="22" y2="116" stroke="#10407e" stroke-width="5"/><line x1="232" y1="116" x2="298" y2="116" stroke="#10407e" stroke-width="5"/><circle cx="90" cy="120" r="4" fill="#1d2633"/><circle cx="230" cy="120" r="4" fill="#1d2633"/>
    <path d="M158 128 A68 68 0 0 0 24 112" fill="none" stroke="#9aa3b0" stroke-dasharray="3 3"/><path d="M162 128 A68 68 0 0 1 296 112" fill="none" stroke="#9aa3b0" stroke-dasharray="3 3"/>
    <rect x="10" y="100" width="8" height="12" fill="#c96a2c"/><rect x="302" y="100" width="8" height="12" fill="#c96a2c"/>${T_(6,94,"arrêt")}${T_(96,145,"gond")}${T_(110,205,"fenêtre")}
    ${coteH(u,90,230,250,"L "+mmv(v,"Largeur entre tableaux"))}${coteV(u,305,128,182,"prof. "+mmv(v,"Profondeur du tableau"))}</svg>`}
  if(banne(v)){return`<svg viewBox="0 0 320 300" role="img" aria-label="Vue de côté">${DEFS(u)}<rect x="10" y="10" width="26" height="280" fill="url(#hz${u})" stroke="#10407e"/><line x1="0" y1="290" x2="320" y2="290" stroke="#566070"/>
    <rect x="36" y="70" width="34" height="24" rx="6" fill="#d6dbe3" stroke="#10407e"/><line x1="56" y1="92" x2="290" y2="150" stroke="#c96a2c" stroke-width="3"/><line x1="56" y1="94" x2="250" y2="125" stroke="#566070" stroke-width="2"/>
    ${v["Lambrequin"]&&v["Lambrequin"]!=="Non"?`<rect x="286" y="150" width="8" height="26" fill="#c96a2c"/>`:""}${T_(76,66,(v["Type de store"]||"store banne")+" · "+(v["Support"]||"support ?").toLowerCase())}
    ${coteH(u,36,292,200,"avancée "+mmv(v,"Avancée"))}${coteV(u,300,92,288,"pose "+mmv(v,"Hauteur de pose"))}</svg>`}
  if(/^Kit/.test(t)||/Traditionnel/.test(t)){lin=`<rect x="70" y="20" width="80" height="70" fill="url(#hz${u})" stroke="#10407e"/>`;cof=[150,40,52,50];cou=[136,90];lab=/^Kit/.test(t)?"coffre existant (kit moteur)":"coffre intérieur";}
  else if(/Bloc/.test(t)){cof=[146,90,44,36];fen=[150,126,240];cou=[140,126];lab="coffre bloc-baie"}
  else if(/enduire/.test(t)){lin=`<rect x="70" y="20" width="130" height="30" fill="url(#hz${u})" stroke="#10407e"/>`;cof=[70,50,80,40];cou=[76,90];lab="coffre à enduire"}
  else if(/Rénovation/.test(t)&&pos==="En tableau"){cof=[72,90,40,38];cou=[72,128];lab="coffre en tableau"}
  else if(zip(v)&&/tableau/i.test(v["Pose"]||"")){cof=[72,90,40,38];cou=[72,128];lab="coffre en tableau"}
  else if(zip(v)&&/plafond|linteau/i.test(v["Pose"]||"")){cof=[72,90,40,38];cou=[72,128];lab="coffre sous linteau"}
  else if(bso(v)){lin=`<rect x="70" y="20" width="130" height="30" fill="url(#hz${u})" stroke="#10407e"/>`;cof=[70,50,60,40];cou=[76,90];lab=(v["Coffre ou linteau"]||"linteau BSO").toLowerCase()}
  else{cof=[30,52,40,38];cou=[62,90];lab="coffre en façade"}
  const pf=+v["Profondeur du tableau"]?mmv(v,"Profondeur du tableau"):"…";
  return`<svg viewBox="0 0 320 300" role="img" aria-label="Coupe verticale">${DEFS(u)}${T_(12,14,"EXT.",'font-weight="700"')}${T_(280,14,"INT.",'font-weight="700"')}${lin}
   <rect x="70" y="240" width="130" height="50" fill="url(#hz${u})" stroke="#10407e"/><polygon points="40,242 70,238 70,248 40,250" fill="#c9d1dc"/>
   <rect x="${fen[0]}" y="${fen[1]}" width="16" height="${fen[2]-fen[1]}" fill="#7d8794"/><line x1="${fen[0]+8}" y1="${fen[1]+12}" x2="${fen[0]+8}" y2="${fen[2]-12}" stroke="#7fb0e0" stroke-width="3"/>
   <rect x="${cof[0]}" y="${cof[1]}" width="${cof[2]}" height="${cof[3]}" rx="${/Quart/.test(v["Forme du coffre"]||"")?14:3}" fill="#d6dbe3" stroke="#10407e" stroke-width="1.5"/>
   <circle cx="${cof[0]+cof[2]/2}" cy="${cof[1]+cof[3]/2}" r="${Math.min(cof[2],cof[3])/3}" fill="none" stroke="#566070"/>${/^Kit/.test(t)?`<text x="${cof[0]+cof[2]/2}" y="${cof[1]+cof[3]/2+4}" font-size="11" font-weight="700" text-anchor="middle" fill="#c96a2c">M</text>`:""}
   ${bso(v)&&v["Guidage"]==="Câbles"?`<line x1="${cou[0]+3}" y1="${cou[1]}" x2="${cou[0]+3}" y2="238" stroke="#566070"/>`:`<rect x="${cou[0]}" y="${cou[1]}" width="6" height="${238-cou[1]}" fill="#aab4c2"/>`}
   <line x1="${cou[0]+3}" y1="${cou[1]}" x2="${cou[0]+3}" y2="200" stroke="#c96a2c" stroke-width="2" stroke-dasharray="5 3"/>
   ${T_(Math.max(6,cof[0]-4),cof[1]-6,lab+(bso(v)?"":" "+taille))}${coteH(u,70,fen[0],272,"prof. tableau "+pf)}
   ${+v["Hauteur disponible au-dessus de l'ouverture"]?coteV(u,212,40,90,"dispo "+mmv(v,"Hauteur disponible au-dessus de l'ouverture")):""}</svg>`}
function svgGarage(p,u){const v=p.v,ty=v["Type"]||"Sectionnelle";let o=`<rect x="10" y="20" width="300" height="56" fill="url(#hz${u})" stroke="#10407e"/><rect x="10" y="76" width="56" height="200" fill="url(#hz${u})" stroke="#10407e"/><rect x="254" y="76" width="56" height="200" fill="url(#hz${u})" stroke="#10407e"/><line x1="0" y1="276" x2="320" y2="276" stroke="#566070" stroke-width="2"/><line x1="0" y1="14" x2="320" y2="14" stroke="#566070" stroke-dasharray="4 3"/>${T_(260,10,"plafond")}`;
  o+=`<rect x="66" y="76" width="188" height="200" fill="#eef1f5" stroke="#10407e"/>`;
  if(/Section/.test(ty))[0,1,2,3].forEach(k=>o+=`<line x1="66" y1="${76+50*k}" x2="254" y2="${76+50*k}" stroke="#7d8794" stroke-width="2"/>`);
  else if(/Enroul/.test(ty)){for(let y=80;y<276;y+=6)o+=`<line x1="66" y1="${y}" x2="254" y2="${y}" stroke="#aab4c2"/>`;o+=`<rect x="66" y="56" width="188" height="20" fill="#d6dbe3" stroke="#10407e"/>`}
  else if(/Battante/.test(ty))o+=`<line x1="160" y1="76" x2="160" y2="276" stroke="#7d8794" stroke-width="2"/>`;
  if((v["Options"]||[]).includes("Hublots"))[100,145,190].forEach(x=>o+=`<rect x="${x}" y="112" width="30" height="14" rx="4" fill="#bcd3ee"/>`);
  if((v["Options"]||[]).includes("Portillon intégré"))o+=`<rect x="190" y="150" width="50" height="124" fill="none" stroke="#c96a2c" stroke-width="2"/>`;
  return`<svg viewBox="0 0 320 320" role="img" aria-label="Vue de face">${DEFS(u)}${o}${T_(160,32,"vue de l'intérieur · "+ty.toLowerCase(),'text-anchor="middle" font-weight="700"')}
   ${coteH(u,66,254,298,"L "+mmv(v,"Tableau L"))}${coteV(u,300,76,276,"H "+mmv(v,"Tableau H"))}${coteV(u,150,20,76,"retombée "+mmv(v,"Retombée de linteau"))}
   ${coteH(u,10,66,258,"G "+mmv(v,"Écoinçon gauche"))}${coteH(u,254,310,258,"D "+mmv(v,"Écoinçon droit"))}</svg>`}
function svgPortail(p,u){const v=p.v,ty=v["Type"]||"Battant",int=(v["Sens (vue de la rue)"]||"Vers l'intérieur")==="Vers l'intérieur",yv=150,dy=int?-1:1;
  let o=`${T_(140,290,"RUE",'font-weight="700"')}${T_(120,22,"PROPRIÉTÉ",'font-weight="700"')}<rect x="40" y="140" width="24" height="24" fill="url(#hz${u})" stroke="#10407e"/><rect x="256" y="140" width="24" height="24" fill="url(#hz${u})" stroke="#10407e"/>`;
  if(/Coulissant/.test(ty)){const g=v["Refoulement (coulissant)"]!=="Vers la droite";o+=`<rect x="64" y="${yv-4}" width="192" height="8" fill="#10407e"/><path d="M${g?120:200} ${yv+24} h${g?-60:60}" stroke="#c96a2c" stroke-width="3" marker-end="url(#fl${u})"/>`
      +`<rect x="${g?2:280}" y="${yv-3}" width="38" height="6" fill="none" stroke="#9aa3b0" stroke-dasharray="4 3"/>`+T_(g?10:230,yv+44,"refoulement "+mmv(v,"Longueur de refoulement disponible"))}
  else if(/Portillon/.test(ty)){o+=`<line x1="64" y1="${yv}" x2="256" y2="${yv}" stroke="#10407e" stroke-width="2" stroke-dasharray="5 3"/><line x1="64" y1="${yv}" x2="64" y2="${yv+dy*150}" stroke="#10407e" stroke-width="5"/><path d="M256 ${yv} A192 192 0 0 ${int?0:1} 64 ${yv+dy*192}" fill="none" stroke="#9aa3b0" stroke-dasharray="3 3"/>`}
  else{const r=v["Vantaux"]==="Inégaux"?.62:.5,xm=64+192*r;o+=`<line x1="64" y1="${yv}" x2="${xm}" y2="${yv}" stroke="#10407e" stroke-width="2" stroke-dasharray="5 3"/><line x1="${xm}" y1="${yv}" x2="256" y2="${yv}" stroke="#10407e" stroke-width="2" stroke-dasharray="5 3"/>`
      +`<line x1="64" y1="${yv}" x2="${64+18}" y2="${yv+dy*(xm-64-10)}" stroke="#10407e" stroke-width="5"/><line x1="256" y1="${yv}" x2="${256-18}" y2="${yv+dy*(256-xm-10)}" stroke="#10407e" stroke-width="5"/>`
      +`<path d="M${xm} ${yv} A${xm-64} ${xm-64} 0 0 ${int?0:1} ${64+18} ${yv+dy*(xm-64-10)}" fill="none" stroke="#9aa3b0" stroke-dasharray="3 3"/><path d="M${xm} ${yv} A${256-xm} ${256-xm} 0 0 ${int?1:0} ${256-18} ${yv+dy*(256-xm-10)}" fill="none" stroke="#9aa3b0" stroke-dasharray="3 3"/>`}
  if(v["Moteur"]&&v["Moteur"]!=="Non")o+=`<circle cx="76" cy="${yv+dy*-18}" r="9" fill="#c96a2c"/><text x="76" y="${yv+dy*-18+4}" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">M</text>`;
  if((v["Accessoires"]||[]).includes("Photocellules"))o+=`<rect x="30" y="170" width="8" height="8" fill="#c96a2c"/><rect x="282" y="170" width="8" height="8" fill="#c96a2c"/><line x1="38" y1="174" x2="282" y2="174" stroke="#c96a2c" stroke-dasharray="2 4"/>`;
  return`<svg viewBox="0 0 320 300" role="img" aria-label="Vue de dessus">${DEFS(u)}${T_(160,40,"vue de dessus · "+ty.toLowerCase()+" · ouverture "+(int?"vers l'intérieur":"vers l'extérieur"),'text-anchor="middle"')}${o}
   ${coteH(u,64,256,250,"entre piliers "+mmv(v,"Entre piliers en bas"))}</svg>`}
// les annotations sont gardées en coordonnées relatives (0 à 1) d'un cadre de proportions fixes : même dessin à l'écran et à l'impression
const coupesHtml=(p,plus,u)=>{const et=ETF.includes(p.f),cro=`<div class="pan grille"><h4>Croquis</h4></div>`,pan=(t,x)=>`<div class="pan"><h4>${t}</h4>${x}</div>`;
  if(et)return`<div class="coupes">${pan("Coupe verticale (haut / bas)",svgV(p,plus,u))}${pan("Coupe horizontale (tableau)",svgH(p,plus,u))}${cro}</div>`;
  if(p.f==="occ"){const v=p.v;return`<div class="coupes">${banne(v)?pan("Vue de côté",svgOccCoupe(p,u)):pan(bat(v)?"Vue de face":"Vue de face",svgOccFace(p,u))+pan(bat(v)?"Vue de dessus (ouverture)":"Coupe verticale (position du coffre)",svgOccCoupe(p,u))}${banne(v)?cro.replace("Croquis","Vue de face / croquis"):cro}</div>`}
  if(p.f==="garage")return`<div class="coupes deux">${pan("Vue de face",svgGarage(p,u))}${cro}</div>`;
  if(p.f==="portail")return`<div class="coupes deux">${pan("Vue de dessus",svgPortail(p,u))}${cro}</div>`;
  return`<div class="coupes seul">${cro}</div>`};
const annSvg=p=>`<svg class="annsvg" viewBox="0 0 1000 1000" preserveAspectRatio="none">${p.ann.map(s=>`<polyline points="${s.p.split(" ").map(xy=>xy.split(",").map(n=>Math.round(n*1000)).join(",")).join(" ")}" fill="none" stroke="${COUL[s.c]||"#c0392b"}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`).join("")}</svg>`;
function coupeBloc(p){const g=document.createElement("section");g.className="grp";const et=ETF.includes(p.f);
  g.innerHTML=`<h3>${et?"Coupes de principe et croquis":p.f==="veranda"?"Plan et croquis":"Croquis du produit"}</h3><p class="sub">${et?"Les habillages choisis se dessinent à leur place ; touchez un + pour en ajouter un. ":p.f==="veranda"?"":"Le dessin suit les choix de la fiche (type, coffre, manœuvre, côtés) et affiche les cotes saisies. "}Touchez « Annoter » pour dessiner par-dessus, au doigt ou au stylet ; touchez-le à nouveau pour faire défiler la page.</p>`;
  const tb=document.createElement("div");tb.className="atb";
  if(!ro())tb.innerHTML=`<button type="button" data-a="on" aria-pressed="${annot}">✏️ Annoter</button>${Object.entries(COUL).map(([n,c])=>`<button type="button" class="pt" data-c="${n}" aria-label="Crayon ${n.toLowerCase()}" aria-pressed="${crayon===n}" style="background:${c}"></button>`).join("")}<button type="button" data-a="undo">↶ Annuler le trait</button><button type="button" data-a="clr">Tout effacer</button>`;
  const w=document.createElement("div");w.innerHTML=coupesHtml(p,!ro(),"e");const z=w.firstChild;if(annot&&!ro())z.classList.add("on");
  const cv=document.createElement("canvas");z.appendChild(cv);
  const paint=()=>{const r=z.getBoundingClientRect();if(!r.width)return;const dp=window.devicePixelRatio||1;cv.width=r.width*dp;cv.height=r.height*dp;const x=cv.getContext("2d");x.scale(dp,dp);x.lineCap="round";x.lineJoin="round";x.lineWidth=3;
    p.ann.forEach(s=>{x.strokeStyle=COUL[s.c]||"#c0392b";x.beginPath();s.p.split(" ").forEach((xy,k)=>{const[a,b]=xy.split(",").map(Number),X=a*r.width,Y=b*r.height;k?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke()})};
  let st=null;const pos=e=>{const r=z.getBoundingClientRect();return((e.clientX-r.left)/r.width).toFixed(3)+","+((e.clientY-r.top)/r.height).toFixed(3)};
  cv.onpointerdown=e=>{if(!annot||ro())return;e.preventDefault();cv.setPointerCapture(e.pointerId);st={c:crayon,p:pos(e)};p.ann.push(st)};
  cv.onpointermove=e=>{if(st){st.p+=" "+pos(e);paint()}};cv.onpointerup=cv.onpointercancel=()=>{if(st){st=null;sched()}};
  tb.querySelectorAll("button").forEach(b=>b.onclick=()=>{const a=b.dataset.a;
    if(a==="on"){annot=!annot;b.setAttribute("aria-pressed",annot);z.classList.toggle("on",annot)}
    else if(a==="undo"){p.ann.pop();paint();sched()}else if(a==="clr"){if(p.ann.length&&confirm("Effacer toutes les annotations de ce produit ?")){p.ann=[];paint();sched()}}
    else{crayon=b.dataset.c;tb.querySelectorAll(".pt").forEach(x=>x.setAttribute("aria-pressed",x===b));if(!annot){annot=true;tb.querySelector('[data-a="on"]').setAttribute("aria-pressed",true);z.classList.add("on")}}});
  lierHab(z,p);
  g.append(tb,z);requestAnimationFrame(paint);if(window.ResizeObserver)new ResizeObserver(paint).observe(z);return g}

// toucher un « + » ou un habillage dessiné ouvre une petite fenêtre : position, profil, coloris (ou case libre)
function lierHab(z,p){if(ro())return;z.querySelectorAll(".hs,.hh").forEach(g=>{const go=e=>{if(annot)return;e.preventDefault();e.stopPropagation();habPop(z,p,g,e)};g.onclick=go;g.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")go(e)}})}
function habPop(z,p,g,e){z.querySelectorAll(".hpop").forEach(x=>x.remove());const hk=g.dataset.hk!=null?+g.dataset.hk:-1,h=hk>=0?{...p.hab[hk]}:{pos:SPOT[g.dataset.sp],p:"",c:"",r:"",pa:""};
  const d=document.createElement("div");d.className="hpop";d.setAttribute("role","dialog");d.setAttribute("aria-label","Habillage");
  const o=(L,v)=>L.map(x=>`<option ${x===v?"selected":""}>${esc2(x)}</option>`).join("");
  d.innerHTML=`<b>Habillage</b><label>Position<select data-k="pos">${o(Object.keys(HAB_POS),h.pos)}</select></label>
   <label>Profil<select data-k="p"><option value="">Choisir…</option>${o([...HAB_PROF,"Autre profil"],h.p)}</select></label><input type="text" data-k="pa" placeholder="Profil : ex. cornière 25×45" value="${esc2(h.pa||"")}" ${h.p==="Autre profil"?"":"hidden"}>
   <label>Coloris<select data-k="c"><option value="">Choisir…</option>${o(HAB_COLS,h.c)}</select></label><input type="text" data-k="r" placeholder="RAL ou référence (ex. RAL 7022 sablé)" value="${esc2(h.r||"")}" ${h.c==="Autre RAL"?"":"hidden"}>
   <div class="hpa">${hk>=0?`<button type="button" data-a="del" class="b2 rouge">Retirer</button>`:""}<button type="button" data-a="x" class="b2">Annuler</button><button type="button" data-a="ok" class="b1">OK</button></div>`;
  const R=z.getBoundingClientRect(),x=(e.clientX||R.left+R.width/2)-R.left,y=(e.clientY||R.top+R.height/2)-R.top;
  d.style.left=Math.max(4,Math.min(R.width-264,x-130))+"px";d.style.top=Math.max(4,Math.min(R.height-60,y+12))+"px";z.appendChild(d);
  d.querySelectorAll("[data-k]").forEach(el=>el.oninput=el.onchange=()=>{h[el.dataset.k]=el.value;d.querySelector('[data-k="pa"]').hidden=h.p!=="Autre profil";d.querySelector('[data-k="r"]').hidden=h.c!=="Autre RAL"});
  d.querySelector("[data-k=p]").focus();
  d.onclick=ev=>{ev.stopPropagation();const a=ev.target.closest("[data-a]");if(!a)return;
    if(a.dataset.a==="x"){d.remove();return}
    if(a.dataset.a==="del"){p.hab.splice(hk,1)}else{if(hk>=0)p.hab[hk]=h;else p.hab.push(h)}
    d.remove();sched();draw()}}
// ---------- ajout d'un produit ----------
function ajout(f){f.innerHTML=`<div class="ftete"><h2>Ajouter un produit</h2></div>${ro()?`<p class="sub">Lecture seule.</p>`:`<section class="grp"><div class="champs">
  <div class="ch large"><span>Quoi ?</span><div class="seg" id="mtaq">${[["Fenêtre","fen"],["Porte-fenêtre","fen"],["Coulissant","fen"],["Fixe","fen"],["Porte d'entrée","porte"],["Porte de garage","garage"],["Volet roulant","occ"],["Volet battant","occ"],["Store","occ"],["Portail","portail"],["Autre","fen"]].map(([l,f])=>`<button type="button" data-q="${esc2(l)}" data-f="${f}">${esc2(l)}</button>`).join("")}</div></div>
  <label class="ch"><span>Repère (pièce)</span><input type="text" id="mtar" placeholder="ex. Séjour"></label><label class="ch large"><span>Désignation</span><input type="text" id="mtad" placeholder="ex. Fenêtre 2 vantaux PVC 1200 × 1350"></label>
  <label class="ch"><span>Famille</span><select class="sel" id="mtaf">${Object.entries(FAM).map(([k,F])=>`<option value="${k}">${esc2(F.n)}</option>`).join("")}</select></label><label class="ch"><span>Cote devis</span><input type="text" id="mtac" placeholder="L × H"></label></div>
  <button type="button" class="b1" id="mtaok">Ajouter et ouvrir sa fiche</button><p class="sub">La fiche s'ouvre avec ses champs, ses coupes et le croquis à dessiner. Elle est notée « ajoutée au métré » pour le bureau (pas dans le devis).</p></section>${S.mt.prod.length?"":`<p class="sub">Aucun produit pour l'instant. Astuce : si le chantier a déjà un métré PDF pré-rempli, ses lignes sont reprises à la création.</p>`}`}`;
  if(ro())return;$m("mtad").oninput=()=>{$m("mtaf").value=famGuess($m("mtad").value)};
  $m("mtaq").querySelectorAll("button").forEach(b=>b.onclick=()=>{$m("mtaq").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));$m("mtaf").value=b.dataset.f;if(b.dataset.q!=="Autre")$m("mtad").value=b.dataset.q+" (ajouté au métré)";$m("mtar").focus()});$m("mtar").oninput=()=>{};
  $m("mtaok").onclick=()=>{const r=$m("mtar").value.trim(),d=$m("mtad").value.trim();if(!r&&!d){$m("mtar").focus();return}
    {const np=newProd(r,d,$m("mtaf").value,$m("mtac").value.trim());np.fg=1;np.ajout=1;preRemplir(np);const q=($m("mtaq").querySelector("[aria-pressed=true]")||{}).dataset;if(q&&q.q){if(np.f==="fen"&&/Fenêtre|Porte-fenêtre|Coulissant|Fixe/.test(q.q))np.v["Type"]=np.v["Type"]||q.q;if(np.f==="occ")np.v["Produit"]=np.v["Produit"]||(q.q==="Store"?"":q.q)}S.mt.prod.push(np)}S.cur=S.mt.prod.length-1;sched();draw()}}

// ---------- consommables du chantier (mêmes calculs que le métré PDF) ----------
function totaux(P=S.mt.prod){const sil={},comp={},hab={},vis={},manque=[];let mou=0;
  P.forEach(p=>{const[L,H]=dims(p),per=2*(L+H),e=p.et;if(!ETF.includes(p.f))return;if(!L||!H){manque.push((p.r||"?")+" · "+p.d);return}
    if(e.silE)sil[e.silE+" (ext.)"]=(sil[e.silE+" (ext.)"]||0)+per;
    if(e.silI&&e.silI!=="Aucun"){const c=(e.silI==="Idem ext."?(e.silE||"teinte ?"):e.silI)+" (int.)";sil[c]=(sil[c]||0)+per}
    if(COMP[e.comp])comp[e.comp]=(comp[e.comp]||0)+per;if(e.mou&&e.mou!=="Aucune")mou++;
    p.hab.forEach(h=>{if(!h.p||!HAB_POS[h.pos]||h.p==="Fourni menuiserie")return;const k=(h.p==="Autre profil"?(h.pa||"Profil à préciser"):h.p)+" · "+(h.c==="Autre RAL"?(h.r||"RAL à préciser"):h.c||"coloris à choisir");hab[k]=(hab[k]||0)+HAB_POS[h.pos](L,H)})});
  P.forEach(p=>p.fix.forEach(v=>{if(!v.t)return;const k=(v.t==="Autre"?(v.ta||"Autre fixation"):v.t)+(v.l&&v.l!=="—"?" "+v.l+" mm":"");vis[k]=(vis[k]||0)+(+v.q||0)}));
  const pl=(n,a,b)=>n+" "+(n>1?b:a);
  const rows=[...Object.entries(sil).map(([k,m])=>["Silicone "+k,pl(Math.ceil(m/1000/12),"cartouche","cartouches"),mlf(m)]),...Object.entries(comp).map(([k,m])=>["Compribande "+k,pl(Math.ceil(m/1000/COMP[k]),"rouleau","rouleaux"),mlf(m)]),
    ...(mou?[["Mousse PU","pour "+pl(mou,"produit","produits"),""]]:[]),...Object.entries(hab).map(([k,m])=>["Habillage "+k,mlf(m),""]),...Object.entries(vis).map(([k,n])=>[k,n+" u",""])];
  return{rows,manque}}
function recap(f){const{rows,manque}=totaux();
  f.innerHTML=`<div class="ftete"><h2>Consommables du chantier</h2></div><p class="sub">Périmètre du tableau ; 12 ml de joint par cartouche de silicone ; rouleaux de compribande selon la dimension (3x7 = 8 m, 4x11 = 5,6 m, 5x14 = 4,3 m, 9x20 = 12 m) ; habillages au mètre linéaire.</p>
   <section class="grp">${rows.length?`<table class="rc"><thead><tr><th>Article</th><th>Quantité</th><th>Linéaire</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc2(r[0])}</td><td class="n">${esc2(r[1])}</td><td>${esc2(r[2])}</td></tr>`).join("")}</tbody></table>`:`<p class="sub">Rien à compter pour l'instant : choisissez l'étanchéité, les habillages et les fixations dans les fiches.</p>`}</section>
   ${manque.length?`<div class="alerte">Pas encore compté (tableau à saisir) : ${manque.map(esc2).join(", ")}</div>`:""}`}

// ---------- impression / PDF ----------
function ficheDoc(mt,j){const P=mt.prod||[],{rows}=totaux(P);
  const val=v=>Array.isArray(v)?v.join(", "):v;
  const fiche=(p,k)=>{p.et=p.et||{};p.hab=p.hab||[];p.fix=p.fix||[];p.ann=p.ann||[];p.ph=p.ph||[];p.v=p.v||{};
    const ch=fields(p).filter(c=>fait(p,c)).map(c=>`<tr><th>${esc2(c.l)}</th><td>${esc2(val(p.v[c.l]))}${c.t==="mm"?" mm":""}${p.v[c.l+" (autre)"]?" · "+esc2(p.v[c.l+" (autre)"]):""}</td></tr>`).join("");
    const e=p.et,et=ETF.includes(p.f)?[["Compribande",e.comp],["Silicone ext.",e.silE],["Silicone int.",e.silI],["Mousse PU",e.mou],["Membrane",e.mem],["Options",[...(e.opt||[]),e.optA].filter(Boolean).join(", ")+(e.sol?" ("+e.sol+" mm)":"")]].filter(x=>x[1]).map(x=>`<tr><th>${x[0]}</th><td>${esc2(x[1])}</td></tr>`).join(""):"";
    const[L,H]=dims(p),hab=p.hab.filter(h=>h.p).map(h=>`<tr><th>${esc2(h.pos||"?")}</th><td><b>${esc2(habProf(h))}</b> · ${esc2(habCol(h))}${L&&H&&HAB_POS[h.pos]?" · "+mlf(HAB_POS[h.pos](L,H)):""}</td></tr>`).join("");
    const fx=p.fix.filter(v=>v.t).map(v=>`${esc2(v.t==="Autre"?(v.ta||"autre fixation"):v.t)}${v.l&&v.l!=="—"?" "+v.l+" mm":""}${v.q?" : "+v.q:""}`).join(" · ");
    return`<section class="pp"><h2>${k+1}. ${esc2(p.r)} <small>${esc2(p.d)} · ${esc2(FAM[p.f].n)}${p.cote?" · cote devis "+esc2(p.cote):""}${p.ajout?" · ajouté au métré":""}</small></h2>
     <div class="pg2"><table>${ch}${et}</table><div>${hab?`<table class="habt"><tr><th colspan="2">Habillages</th></tr>${hab}</table>`:""}${fx?`<p><b>Fixations :</b> ${fx}</p>`:""}${p.v.rem?`<p><b>Remarque :</b> ${esc2(p.v.rem)}</p>`:""}${p.ph.length?`<p>${p.ph.length} photo${p.ph.length>1?"s":""} dans l'appli</p>`:""}</div></div>
     <div class="cw">${coupesHtml(p,false,"p"+k).replace(/<\/div>$/,annSvg(p)+"</div>")}</div></section>`};
  return`<header><b>MGDS · Métré</b><span>${esc2(j.client||"")}<br>${esc2([j.adresse,j.ville].filter(Boolean).join(", "))}</span><span>Jeu de pose ${(mt.jeu||{}).c??5} mm / côté, ${(mt.jeu||{}).t??5} mm en tête<br>${new Date().toLocaleDateString("fr-FR")}</span></header>
    ${ecartsHtml(ecarts(mt),"⚠ Écarts avec le devis : à reporter sur la commande")}${P.map(fiche).join("")}<section class="pp"><h2>Consommables du chantier</h2><table>${rows.map(r=>`<tr><th>${esc2(r[0])}</th><td>${esc2(r[1])}</td><td>${esc2(r[2])}</td></tr>`).join("")}</table></section>`}
window.mtFicheHtml=(mt,j)=>ficheDoc(JSON.parse(JSON.stringify(mt||{prod:[]})),j||{});
// feuille de pose (Steven, 23/11/2026) : les poseurs ont tout sur la feuille de préparation : consommables, habillages par position
// et coloris, seuils et sol, options à prévoir, remarques, croquis annotés ; pas les dimensions (elles restent sur le métré)
const DIM=/^(Tableau|Hors tout|Cote de commande|Largeur|Hauteur de tableau|Hauteur au faîtage|Façade : longueur|Pignon|Entre piliers|Retombée|Écoinçon|Profondeur|Avancée|Hauteur$|Hauteur disponible|Hauteur du muret|Hauteur des soubassements|Hauteur sous plafond|Longueur)/;
function poseDoc(mt,j){const P=(mt.prod||[]).map(p=>({et:{},hab:[],fix:[],ann:[],ph:[],v:{},...p})),{rows}=totaux(P),val=v=>Array.isArray(v)?v.join(", "):v;
  const fiche=(p,k)=>{const L=fields(p).filter(c=>fait(p,c)&&!DIM.test(c.l)&&c.t!=="tri"&&c.t!=="cmd").map(c=>[c.l,val(p.v[c.l])+(c.t==="mm"?" mm":"")+(p.v[c.l+" (autre)"]?" · "+p.v[c.l+" (autre)"]:"")]);
    const e=p.et,pr=[...(e.opt||[]),e.optA].filter(Boolean),et=[e.comp&&"compribande "+e.comp,e.silE&&"silicone ext. "+e.silE,e.silI&&e.silI!=="Aucun"&&"silicone int. "+(e.silI==="Idem ext."?e.silE||"":e.silI),e.mou&&e.mou!=="Aucune"&&"mousse PU "+e.mou.toLowerCase(),e.mem&&e.mem!=="Aucune"&&"membrane "+e.mem].filter(Boolean);
    const[Lx,Hx]=dims(p),hab=p.hab.filter(h=>h.p).map(h=>`<tr><th>${esc2(h.pos||"?")}</th><td><b>${esc2(habProf(h))}</b> · ${esc2(habCol(h))}${Lx&&Hx&&HAB_POS[h.pos]?" · "+mlf(HAB_POS[h.pos](Lx,Hx)):""}</td></tr>`).join("");
    const fx=p.fix.filter(v=>v.t).map(v=>`${esc2(v.t==="Autre"?(v.ta||"autre fixation"):v.t)}${v.l&&v.l!=="—"?" "+v.l+" mm":""}${v.q?" : "+v.q:""}`).join(" · ");
    return`<section class="pp"><h2>${k+1}. ${esc2(p.r||"")} <small>${esc2(p.d)} · ${esc2(FAM[p.f].n)}${p.ajout?" · ajouté au métré":""}</small></h2>
     ${p.v.rem?`<div class="prev">⚠ ${esc2(p.v.rem)}</div>`:""}${pr.length?`<div class="prev">À prévoir : ${esc2(pr.join(", "))}${e.sol?" (sol modifié de "+esc2(e.sol)+" mm)":""}</div>`:""}
     <div class="pg2"><table>${L.map(([l,v])=>`<tr><th>${esc2(l)}</th><td>${esc2(v)}</td></tr>`).join("")}${et.length?`<tr><th>Étanchéité</th><td>${esc2(et.join(" · "))}</td></tr>`:""}${fx?`<tr><th>Fixations</th><td>${fx}</td></tr>`:""}</table>
      <div>${hab?`<table class="habt"><tr><th colspan="2">Habillages</th></tr>${hab}</table>`:p.hab.length?`<div class="prev">Habillage à préciser : profil ou coloris pas encore choisi</div>`:`<p class="sub">Pas d'habillage prévu.</p>`}</div></div>
     <div class="cw">${coupesHtml(p,false,"q"+k).replace(/<\/div>$/,annSvg(p)+"</div>")}</div></section>`};
  return`<header><b>Pose · habillages, seuils et croquis</b><span>${esc2(j.client||"")}<br>${esc2([j.adresse,j.ville].filter(Boolean).join(", "))}</span><span>D'après le métré tablette${mt.cree?" du "+new Date(mt.cree).toLocaleDateString("fr-FR"):""}<br>Les dimensions sont sur le métré.</span></header>
   ${rows.length?`<section class="pp"><h2>Consommables du métré</h2><table>${rows.map(r=>`<tr><th>${esc2(r[0])}</th><td>${esc2(r[1])}</td><td>${esc2(r[2])}</td></tr>`).join("")}</table></section>`:""}
   ${P.map(fiche).join("")}`}
window.mtTotaux=mt=>{try{return totaux(JSON.parse(JSON.stringify(mt.prod||[])).map(p=>({et:{},hab:[],fix:[],ann:[],ph:[],v:{},...p}))).rows}catch(_){return[]}};
window.mtPoseHtml=(mt,j)=>poseDoc(JSON.parse(JSON.stringify(mt||{prod:[]})),j||{});
function imprimer(){const j=jobs.get(S.jid)||{};$m("mtprint").innerHTML=ficheDoc(S.mt,j);
  document.body.classList.add("mtprinting");const fin=()=>{document.body.classList.remove("mtprinting");removeEventListener("afterprint",fin)};addEventListener("afterprint",fin);setTimeout(()=>window.print(),50)}

// redessin après une cote : attendu jusqu'à la fin du toucher en cours (sinon le bouton touché disparaît sous le doigt)
let doigt=false,aRedessiner=false;
function redraw(){if(!S)return;if(doigt){aRedessiner=true;return}majVisuels()}
addEventListener("pointerdown",()=>{doigt=true},true);
const lache=()=>setTimeout(()=>{doigt=false;if(aRedessiner&&S){aRedessiner=false;majVisuels()}},0);
addEventListener("click",lache,true);addEventListener("pointercancel",lache,true);addEventListener("pointerup",()=>setTimeout(lache,350),true);
function majVisuels(){if(!S||!S.mt.prod[S.cur])return;const p=S.mt.prod[S.cur],f=$m("mtfiche");
  const z=f.querySelector(".coupes");if(z){const t=document.createElement("div");t.innerHTML=coupesHtml(p,!ro(),"e");const nv=t.querySelectorAll(".pan svg");z.querySelectorAll(".pan svg").forEach((o,k)=>{if(nv[k])o.replaceWith(nv[k])});
    lierHab(z,p)}
  f.querySelectorAll("[data-cmdh]").forEach(h=>{const L=+p.v["Tableau L"],H=+p.v["Tableau H"],J=S.mt.jeu,prop=L&&H?`${L-2*J.c} × ${H-J.t}`:"";h.innerHTML=prop?`Calcul : tableau − ${J.c} mm par côté, − ${J.t} mm en tête = <b>${prop}</b> `:"Saisissez le tableau pour avoir le calcul";
    if(prop&&!ro()&&p.v["Cote de commande"]!==prop){const b=document.createElement("button");b.type="button";b.className="b2 mini";b.textContent="Reprendre";b.onclick=()=>{p.v["Cote de commande"]=prop;sched();draw()};h.appendChild(b)}});
  const[L,H]=dims(p);f.querySelectorAll(".hl .ml").forEach((m,k)=>{const h=p.hab[k];if(h)m.textContent=L&&H&&HAB_POS[h.pos]?mlf(HAB_POS[h.pos](L,H)):"–"})}
// ---------- fenêtre ----------
const css=`#mtov[hidden]{display:none!important}#mtov{position:fixed;inset:0;z-index:60;background:var(--bg,#f5f5f7);color:var(--ink,#1d1d1f);display:grid;grid-template-rows:auto 1fr;font-size:16px}
#mtov .mbar{background:#10407e;color:#fff;padding:10px 16px;padding-top:max(10px,env(safe-area-inset-top));display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center}
#mtov .mbar b{font-size:19px}#mtov .mbar .s{font-size:13px;opacity:.85}#mtov .mbar .sp{margin-left:auto}
#mtov .mbar label{font-size:13px;display:flex;align-items:center;gap:4px}#mtov .mbar input{width:46px;font:600 15px inherit;padding:5px;border-radius:7px;border:0;text-align:center}
#mtov .mbar button{font:600 14px inherit;border:0;border-radius:10px;padding:9px 13px;background:#fff;color:#10407e;cursor:pointer}
#mtov .mbar #mtetat{font-size:12px;opacity:.85}
#mtov .corps{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:0}
#mtov .liste{border-right:1px solid var(--line,#e3e3e8);padding:10px;display:grid;gap:8px;align-content:start;overflow:auto;background:var(--sunk,#ededf0)}
#mtov .liste .it{all:unset;box-sizing:border-box;cursor:pointer;display:grid;gap:2px;padding:9px 11px;border-radius:12px;border:1.5px solid var(--line,#e3e3e8);background:var(--surface,#fff)}
#mtov .liste .it[aria-current="true"]{border-color:#10407e;box-shadow:0 0 0 2px #10407e inset}#mtov .liste .it small{color:var(--muted,#6e6e73);font-size:12.5px}
#mtov .liste .recap{background:#e8eff8}#mtov .jauge{height:5px;border-radius:3px;background:var(--line,#e3e3e8);overflow:hidden}#mtov .jauge i{display:block;height:100%;background:#2f7d4a}
#mtov .ajout.haut{border-style:solid;border-color:#10407e;color:#10407e;background:#e8eff8}#mtov .ajout{font:600 14px inherit;border:1.5px dashed var(--muted,#6e6e73);border-radius:12px;padding:10px;background:none;color:var(--ink,#1d1d1f);cursor:pointer}
#mtov .fiche{padding:14px 18px 40px;display:grid;gap:14px;align-content:start;overflow:auto;-webkit-overflow-scrolling:touch}
#mtov .ftete{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}#mtov .ftete h2{margin:0;font-size:22px;color:#10407e}
#mtov .grp{border:1px solid var(--line,#e3e3e8);border-radius:14px;padding:12px 14px;display:grid;gap:12px;background:var(--surface,#fff)}
#mtov .grp h3{font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:#10407e;margin:0}#mtov .sub{font-size:13px;color:var(--muted,#6e6e73);margin:0}
#mtov .champs{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px 16px}
#mtov .ch{display:grid;gap:5px;align-content:start;min-width:0}#mtov .ch>span{font-size:14px;font-weight:600}#mtov .ch small{font-weight:400;color:var(--muted,#6e6e73)}#mtov .ch.large{grid-column:1/-1}
#mtov .tri{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#mtov .tri label{display:grid;gap:3px}#mtov input.autre{margin-top:4px;border-style:dashed}#mtov .ch.prop .seg button[aria-pressed="true"]{background:#5b84b8;border-color:#5b84b8}#mtov .ch.prop>span::after{content:" · repris du métré";font-weight:400;font-size:12px;color:#5b84b8}#mtov .ch.prop input{background:#eef4fb}#mtov .ch.vide{background:#fff1e0;box-shadow:0 0 0 2px #f0a35e;border-radius:10px;padding:6px 8px}#mtov .ch.vide>span::after{content:" · à remplir";font-weight:600;font-size:12px;color:#c96a2c}#mtov .ch.vide .mm,#mtov .ch.vide input[type=text],#mtov .ch.vide .seg button{border-color:#f0a35e}
#mtov .mm{display:flex;align-items:center;border:1px solid var(--line,#d3dae4);border-radius:10px;background:var(--surface,#fff);overflow:hidden}
#mtov .mm input{border:0;font:600 19px inherit;padding:8px 10px;width:100%;min-width:0;background:none;color:inherit}#mtov .mm em{font-style:normal;color:var(--muted,#6e6e73);padding:0 10px;font-size:14px}
#mtov input[type=text],#mtov textarea,#mtov .sel{font:400 16px inherit;width:100%;box-sizing:border-box;border:1px solid var(--line,#d3dae4);border-radius:10px;padding:9px 10px;background:var(--surface,#fff);color:inherit;min-width:0}
#mtov textarea{min-height:70px}
#mtov .seg{display:flex;flex-wrap:wrap;gap:6px}#mtov .seg button{font:600 14px inherit;padding:9px 12px;border-radius:10px;border:1.5px solid var(--line,#d3dae4);background:var(--surface,#fff);color:inherit;cursor:pointer}
#mtov .seg button[aria-pressed="true"]{background:#10407e;border-color:#10407e;color:#fff}
#mtov .pas{display:flex;align-items:center;gap:6px}#mtov .pas button{width:42px;height:42px;border-radius:10px;border:1.5px solid var(--line,#d3dae4);background:var(--surface,#fff);color:inherit;font:700 20px inherit;cursor:pointer}#mtov .pas b{min-width:30px;text-align:center;font-size:19px}
#mtov .hl{display:grid;grid-template-columns:minmax(150px,1.3fr) minmax(130px,1fr) minmax(150px,1.2fr) 70px 40px;gap:8px;align-items:center}
#mtov .hl .ml{font-size:14px;color:var(--muted,#6e6e73);text-align:right}#mtov .x{width:40px;height:40px;border-radius:10px;border:1px solid var(--line,#d3dae4);background:var(--surface,#fff);color:var(--muted,#6e6e73);font-size:18px;cursor:pointer}
#mtov .plus{font:600 14px inherit;border:1.5px dashed var(--muted,#6e6e73);border-radius:10px;padding:9px 12px;background:none;color:#10407e;cursor:pointer;justify-self:start}
#mtov .b1,#mtov .b2{font:600 15px inherit;border-radius:10px;padding:10px 14px;cursor:pointer;justify-self:start}#mtov .b1{background:#10407e;color:#fff;border:0}#mtov .b2{background:var(--surface,#fff);color:inherit;border:1.5px solid var(--line,#d3dae4)}
#mtov .b2.mini{padding:3px 8px;font-size:12px;margin-left:6px}#mtov .b2.rouge{color:#b83a3a}#mtov .acts{display:flex;flex-wrap:wrap;gap:10px}
#mtov .atb{display:flex;flex-wrap:wrap;gap:6px;align-items:center}#mtov .atb button{font:600 14px inherit;padding:8px 12px;border-radius:10px;border:1.5px solid var(--line,#d3dae4);background:var(--surface,#fff);color:inherit;cursor:pointer}
#mtov .atb button[aria-pressed="true"]{box-shadow:0 0 0 2px #10407e inset;border-color:#10407e}#mtov .atb .pt{width:34px;height:34px;padding:0;border-radius:50%}
.coupes{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;aspect-ratio:3/1.5}.coupes.seul{grid-template-columns:1fr;aspect-ratio:2.2/1}.coupes.deux{grid-template-columns:1fr 1fr;aspect-ratio:2/1.05}
.coupes .pan{border:1px solid #c9d1dc;border-radius:10px;background:#fff;color:#1d2633;padding:6px;display:flex;flex-direction:column;gap:2px;min-height:0;overflow:hidden}
.coupes .pan h4{margin:0;font-size:13px;color:#10407e}.coupes .pan svg{flex:1;min-height:0;width:100%;height:100%}
.coupes .pan.grille{background-image:linear-gradient(#e4e9f0 1px,transparent 1px),linear-gradient(90deg,#e4e9f0 1px,transparent 1px);background-size:14px 14px}
.coupes canvas,.coupes .annsvg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#mtov .coupes.on canvas{pointer-events:auto;touch-action:none;outline:3px dashed #c96a2c;outline-offset:3px;border-radius:10px}#mtov .hs{cursor:pointer}
#mtov .photo{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#mtov .photo label{font:600 14px inherit;padding:9px 12px;border-radius:10px;background:#e8eff8;color:#10407e;cursor:pointer}#mtov .photo img{width:70px;height:70px;object-fit:cover;border-radius:8px;display:block}
#mtov .alerte{border-left:4px solid #c96a2c;background:#fbe3d3;color:#1d2633;padding:8px 12px;border-radius:0 8px 8px 0;font-size:14px}
#mtov table.rc{width:100%;border-collapse:collapse;font-size:15px}#mtov table.rc th,#mtov table.rc td{text-align:left;padding:8px;border-bottom:1px solid var(--line,#e3e3e8)}#mtov table.rc td.n{font-weight:700;color:#10407e}
#mtov.ro .fiche input,#mtov.ro .fiche select,#mtov.ro .fiche textarea,#mtov.ro .fiche button{pointer-events:none}
@media (max-width:760px){#mtov .corps{grid-template-columns:1fr;grid-template-rows:auto 1fr}#mtov .liste{grid-auto-flow:column;grid-auto-columns:200px;overflow-x:auto;border-right:0;border-bottom:1px solid var(--line,#e3e3e8)}#mtov .hl{grid-template-columns:1fr 1fr}}
.coupes .hh{cursor:pointer}.coupes .hh:hover polyline:first-child{stroke:#0952a1}
.hpop{position:absolute;z-index:5;width:260px;background:#fff;color:#1d2633;border:1px solid #10407e;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:10px;display:grid;gap:7px;font-size:14px}
.hpop label{display:grid;gap:3px;font-weight:600}.hpop select,.hpop input{font:15px inherit;padding:7px;border:1px solid #c9d1dc;border-radius:8px;width:100%;box-sizing:border-box}
.hpop .hpa{display:flex;gap:6px;justify-content:flex-end}.hpop button{font:600 14px inherit;padding:7px 11px;border-radius:8px;cursor:pointer;border:1px solid #c9d1dc;background:#fff}.hpop .b1{background:#10407e;color:#fff;border-color:#10407e}.hpop .rouge{color:#b83a3a}
.mtlire{color:#1d2633;background:#fff;font:14px/1.4 Helvetica,Arial,sans-serif;padding:4px}
.mtlire header{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;border-bottom:2px solid #10407e;padding-bottom:6px;margin-bottom:10px}.mtlire header b{font-size:18px;color:#10407e}
.mtlire .pp{margin-bottom:22px}.mtlire h2{font-size:17px;color:#10407e;margin:8px 0}.mtlire h2 small{font-weight:400;color:#566070;font-size:13px}
.mtlire .pg2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.mtlire table{border-collapse:collapse;width:100%}.mtlire th,.mtlire td{text-align:left;border-bottom:1px solid #e3e8ef;padding:4px 6px;vertical-align:top}.mtlire th{color:#566070;font-weight:600;width:42%}
.ecarts table{border:2px solid #c96a2c}.ecarts th{color:#c96a2c}.ecarts tr.e-ajout td,.ecarts tr.e-retire td{background:#fbe3d3}#mtov .it.ecart{background:#fbe3d3!important;border-color:#c96a2c}#mtov .ecn{color:#c96a2c}
.mtlire .prev{border-left:4px solid #c96a2c;background:#fbe3d3;padding:6px 10px;border-radius:0 8px 8px 0;margin:4px 0;font-weight:600}
.mtlire .habt{border:2px solid #1f5fbf;border-radius:8px}.mtlire .habt th:first-child{color:#1f5fbf}.mtlire .cw{margin-top:8px;overflow-x:auto}.mtlire .cw .coupes{min-width:640px}
#mtprint{display:none}
@media print{body.mtprinting>*:not(#mtprint){display:none!important}body.mtprinting #mtprint{display:block;color:#1d2633;font:11px/1.35 Helvetica,Arial,sans-serif}
 #mtprint header{display:flex;justify-content:space-between;gap:10px;border-bottom:2px solid #10407e;padding-bottom:6px;margin-bottom:8px}#mtprint header b{font-size:18px;color:#10407e}
 #mtprint .pp{break-inside:avoid;margin-bottom:12px}#mtprint h2{font-size:14px;color:#10407e;margin:6px 0}#mtprint h2 small{font-weight:400;color:#566070}
 #mtprint .pg2{display:grid;grid-template-columns:1fr 1fr;gap:12px}#mtprint table{border-collapse:collapse;width:100%}#mtprint th,#mtprint td{text-align:left;border-bottom:1px solid #e3e8ef;padding:2px 4px;vertical-align:top}#mtprint th{color:#566070;font-weight:600;width:45%}
 #mtprint .cw{margin-top:6px;width:80%}#mtprint header b{white-space:nowrap}@page{size:A4;margin:12mm}}`;
const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
const ov=document.createElement("div");ov.id="mtov";ov.hidden=true;ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Métré sur tablette");
ov.innerHTML=`<div class="mbar"><b id="mttitre">Métré</b><span class="s" id="mtsous"></span><span class="s" id="mtglob"></span><span class="sp"></span><label>Jeu de pose<input id="mtjc" inputmode="numeric" aria-label="Jeu de pose par côté en mm"> mm / côté</label><label><input id="mtjt" inputmode="numeric" aria-label="Jeu de pose en tête en mm"> mm en tête</label><span id="mtetat"></span><button type="button" id="mtpr">🖨️ Imprimer / PDF</button><button type="button" id="mtx">Fermer</button></div>
 <div class="corps"><nav class="liste" id="mtliste" aria-label="Produits"></nav><div class="fiche" id="mtfiche"></div></div>`;
document.body.appendChild(ov);const pr=document.createElement("div");pr.id="mtprint";document.body.appendChild(pr);
$m("mtx").onclick=()=>mtClose();$m("mtpr").onclick=()=>{save();imprimer()};
[["mtjc","c"],["mtjt","t"]].forEach(([id,k])=>{$m(id).oninput=e=>{if(ro())return;S.mt.jeu[k]=+e.target.value.replace(/\D/g,"")||0;sched()};$m(id).onchange=()=>redraw()});
addEventListener("beforeunload",e=>{if(S&&S.dirty){save();e.preventDefault();e.returnValue=""}});
})();
