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
const FAM={
 fen:{n:"Fenêtres et portes-fenêtres",g:[
  ["Produit",[C("Type",["Fenêtre","Porte-fenêtre","Coulissant","Fixe","Soufflet"]),C("Matière",["PVC","PVC/alu","Alu","Bois"]),N("Vantaux"),C("Sens (vue int.)",["TD","TG","Fixe"]),T("Coloris int. / ext.")]],
  ["Pose",[C("Type de pose",["Neuf applique","Réno","Dépose totale","Tunnel"]),M("Épaisseur du dormant existant",{opt:1}),M("Épaisseur d'isolation (doublage)"),C("Habillage int.",["Aucun","Cornières","Tôle pliée","Autre"],{opt:1}),C("Habillage ext.",["Aucun","Cornières","Tôle pliée","Autre"],{opt:1})]],
  ["Dimensions",[M("Tableau L"),M("Tableau H"),M("Hors tout L",{opt:1}),M("Hors tout H",{opt:1}),M("Hauteur d'allège",{opt:1}),CMD]],
  ["Vitrage et options",[C("Vitrage",["Double","Triple","Feuilleté","Phonique","Granité"]),C("Petits bois",["Non","Incorporés","Collés"],{opt:1}),C("Appui / seuil",["Appui","Seuil alu","Seuil PMR"]),C("Ventilation",["Aucune","Grille"]),C("Occultation",["Aucune","Volet roulant","Store zip","BSO"],{opt:1})]]]},
 porte:{n:"Porte d'entrée",g:[
  ["Produit",[C("Matière",["Alu","PVC","Bois","Acier"]),T("Modèle",{opt:1}),T("Coloris int. / ext. (RAL)"),C("Sens (vue int.)",["Poussant gauche","Poussant droit"]),N("Vantaux")]],
  ["Pose et dimensions",[C("Dormant",["Réno + habillages","Neuf"]),M("Épaisseur d'isolation (doublage)",{opt:1}),M("Tableau L"),M("Tableau H"),M("Hors tout L",{opt:1}),M("Hors tout H",{opt:1}),M("Épaisseur du bâti existant",{opt:1}),M("Largeur du vantail principal",{opt:1}),CMD]],
  ["Seuil et imposte",[C("Seuil",["Standard","Extra-plat PMR","Encastré"]),C("Imposte / fixe latéral",["Aucun","Rectangulaire","Cintre","Plein cintre"])]],
  ["Quincaillerie",[C("Serrure",["3 points","5 points","Automatique","Connectée"]),C("Tirage",["Béquille","Barre de tirage"]),MU("Options",["Ferme-porte","Gâche électrique","Judas","Boîte aux lettres"],{opt:1}),T("Arrivée électrique",{opt:1})]]]},
 garage:{n:"Porte de garage",g:[
  ["Produit",[C("Type",["Sectionnelle","Basculante","Enroulable","Battante"]),T("Coloris int. / ext."),MU("Options",["Hublots","Portillon intégré"],{opt:1})]],
  ["Dimensions",[M("Tableau L"),M("Tableau H"),M("Retombée de linteau"),M("Écoinçon gauche"),M("Écoinçon droit"),M("Profondeur dégagée"),M("Hauteur sous plafond",{opt:1})]],
  ["Sol et électricité",[C("Sol",["De niveau","En pente","Seuil"]),C("Prise électrique à proximité",["Oui","Non"]),C("Motorisation",["Oui","Non"]),N("Télécommandes",{opt:1})]]]},
 occ:{n:"Occultation",g:[
  ["Produit",[C("Produit",["Volet roulant","Store zip","BSO","Store banne","Volet battant","Persienne"]),C("Pose",["Coffre extérieur","Coffre intérieur","Sous linteau","Coffre caché","En façade"]),T("Lames ou toile, coloris"),T("Coloris coffre et coulisses",{opt:1})]],
  ["Dimensions",[M("Largeur (entre tapées ou tableau)"),M("Hauteur"),M("Profondeur du tableau",{opt:1}),M("Hauteur de flèche",{opt:1}),M("Avancée (store banne)",{opt:1})]],
  ["Commande",[C("Manœuvre",["Sangle","Treuil","Moteur filaire","Radio RTS","Radio io","Solaire"]),C("Côté manœuvre / perçage",["Gauche","Droite"]),T("Arrivée électrique : où ?",{opt:1}),C("Capteur",["Aucun","Vent","Vent et soleil"],{opt:1}),C("Commande",["Inter","Télécommande","Domotique"])]]]},
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
const VIS={"SFS blanche":[72,92,112,132,152,182,212],"SFS noire":[72,92,112,132,152,182,212],"Vis béton":[60,80,100,120,150],"Vis bois":[30,40,50,60,70,80,100,120],"Pattes de fixation":["—"]};
const ETF=["fen","porte"],COUL={Rouge:"#c0392b",Bleu:"#1f5fbf",Noir:"#1d2633"};
const SPOT={he:"Haut ext.",be:"Bas ext.",hi:"Haut int.",bi:"Bas int.",me:"Montants ext.",mi:"Montants int."};
const esc2=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const mlf=n=>(n/1000).toLocaleString("fr-FR",{maximumFractionDigits:1})+" ml";
const famGuess=s=>{s=(s||"").toLowerCase();return/porte d.entr|porte entr/.test(s)?"porte":/garage|sectionnel|basculant/.test(s)?"garage":/volet|store|bso|zip|persienne|brise.soleil/.test(s)?"occ":/portail|portillon|cl[oô]ture/.test(s)?"portail":/v[ée]randa|pergola/.test(s)?"veranda":"fen"};
const newProd=(r,d,f,cote)=>({k:Math.random().toString(36).slice(2,9),r:r||"",d:d||"",f:f||famGuess(d),cote:cote||"",v:{},hab:[],et:{comp:"",silE:"",silI:"",mem:"",mou:"",opt:[],sol:""},fix:[],ann:[],ph:[]});

let S=null,annot=false,crayon="Rouge";const urls=new Map();
const ro=()=>!(canWrite||canFill);
const fields=p=>FAM[p.f].g.flatMap(g=>g[1]);
const fait=(p,c)=>{const v=p.v[c.l];return Array.isArray(v)?v.length>0:v!==undefined&&v!==""&&v!==0};
const prog=p=>{const cs=fields(p).filter(c=>!c.opt);let a=cs.filter(c=>fait(p,c)).length,b=cs.length;
  if(ETF.includes(p.f)){b+=3;a+=(p.et.comp?1:0)+(p.et.silE?1:0)+(p.et.silI?1:0);p.hab.forEach(h=>{b++;if(h.pos&&h.p&&(h.c||h.p==="Fourni menuiserie"))a++})}
  return[a,b]};
const dims=p=>[+p.v["Tableau L"]||+p.v["Largeur (entre tapées ou tableau)"]||0,+p.v["Tableau H"]||+p.v["Hauteur"]||0];

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
async function lignesPdf(j){
  const d=(j.docs||[]).find(d=>d.type==="Métré"&&!d.mt&&/\.pdf$/i.test(d.name||""));if(!d||!window.PDFLib)return[];
  try{const r=await fetch("/_blob/"+d.id);if(!r.ok)return[];const doc=await PDFLib.PDFDocument.load(await r.arrayBuffer(),{ignoreEncryption:true});
    const F=doc.getForm().getFields().map(f=>{const n=f.getName(),m=/^cellule_(\d+)_(\d+)$/.exec(n);let v="";try{v=f.getText?f.getText()||"":""}catch(_){}return m?{p:+m[1],i:+m[2],v:v.trim()}:null}).filter(Boolean).sort((a,b)=>a.p-b.p||a.i-b.i);
    const out=[];for(let k=0;k<F.length-1;k++){const a=F[k],b=F[k+1];if(a.v&&!/^\d/.test(a.v)&&/^\d+\s*[×x*]\s*\d+$/.test(b.v)){
      const m=/^([A-ZÀ-Ü0-9'’ /.-]{2,}?)\s+(?=[a-zà-ü])(.*)$/.exec(a.v),p=newProd(m?m[1].trim():"",m?m[2]:a.v,null,b.v.replace(/\s*[x*]\s*/," × "));
      const g=n=>(F[k+n]&&F[k+n].p===a.p?F[k+n].v:"");if(/^\d+$/.test(g(2)))p.v["Tableau L"]=g(2);if(/^\d+$/.test(g(3)))p.v["Tableau H"]=g(3);
      if(/^\d+$/.test(g(4)))p.v["Hors tout L"]=g(4);if(/^\d+$/.test(g(5)))p.v["Hors tout H"]=g(5);if(g(6))p.v["Cote de commande"]=g(6).replace(/\s*[x*]\s*/," × ");
      out.push(p);k++}}
    return out}catch(_){return[]}}
window.mtNew=async jid=>{const j=jobs.get(jid);if(!j)return;
  const prod=await lignesPdf(j);
  const doc={id:"mt-"+Math.random().toString(36).slice(2,12),type:"Métré",name:"Métré tablette",at:today(),by:me||"",size:0,traite:true,mt:{jeu:{c:5,t:5},prod,cree:today()},rempli:{le:today(),reste:1,total:1}};
  try{await db.doc("chantiers/"+jid).update({docs:[...(j.docs||[]),doc]});j.docs=[...(j.docs||[]),doc];mtOpen(jid,doc.id);
    toast(prod.length?prod.length+" produit"+(prod.length>1?"s repris":" repris")+" du métré PDF":"Métré créé : ajoutez les produits")}
  catch(_){toast("Création impossible : vérifiez la connexion ou vos droits.")}};

// ---------- ouverture ----------
window.mtOpen=(jid,did)=>{const j=jobs.get(jid),d=j&&(j.docs||[]).find(d=>d.id===did);if(!d)return;
  S={jid,did,mt:JSON.parse(JSON.stringify(d.mt||{jeu:{c:5,t:5},prod:[]})),cur:0,dirty:false};S.mt.prod.forEach(p=>{p.et=p.et||{opt:[]};p.et.opt=p.et.opt||[];p.hab=p.hab||[];p.fix=p.fix||[];p.ann=p.ann||[];p.ph=p.ph||[];p.v=p.v||{}});
  if(!S.mt.prod.length)S.cur=-2;
  $m("mttitre").textContent="Métré · "+(j.client||"");$m("mtsous").textContent=[j.adresse,j.ville].filter(Boolean).join(", ");
  $m("mtov").hidden=false;$m("mtov").classList.toggle("ro",ro());document.body.style.overflow="hidden";draw()};
window.mtClose=async()=>{if(!S)return;if(S.dirty){await save()}S=null;$m("mtov").hidden=true;document.body.style.overflow=""};

// ---------- affichage ----------
function liste(){const L=$m("mtliste");const P=S.mt.prod;
  L.innerHTML=P.map((p,k)=>{const[a,b]=prog(p);return`<button type="button" class="it" data-k="${k}" aria-current="${k===S.cur}"><b>${esc2(p.r||"Repère ?")}</b><small>${esc2(FAM[p.f].n)}</small><small>${esc2(p.d)}</small><span class="jauge"><i style="width:${Math.round(100*a/Math.max(1,b))}%"></i></span><small>${a}/${b} points</small></button>`}).join("")
   +`<button type="button" class="it recap" data-k="-1" aria-current="${S.cur===-1}"><b>Consommables du chantier</b><small>Totaux calculés</small></button>`+(ro()?"":`<button type="button" class="ajout" data-k="-2">+ Ajouter un produit</button>`);
  L.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{S.cur=+b.dataset.k;draw();$m("mtfiche").scrollTop=0});
  const t=P.reduce((s,p)=>{const[a,b]=prog(p);return[s[0]+a,s[1]+b]},[0,0]);$m("mtglob").textContent=`${t[0]}/${t[1]} points relevés`}
function draw(){liste();const f=$m("mtfiche");f.innerHTML="";$m("mtjc").value=S.mt.jeu.c;$m("mtjt").value=S.mt.jeu.t;
  if(S.cur===-1){recap(f);return}if(S.cur===-2||!S.mt.prod[S.cur]){ajout(f);return}
  const p=S.mt.prod[S.cur];
  const t=document.createElement("div");t.className="ftete";
  t.innerHTML=`<label class="ch"><span>Repère</span><input type="text" data-x="r" value="${esc2(p.r)}"></label><label class="ch"><span>Désignation</span><input type="text" data-x="d" value="${esc2(p.d)}"></label><label class="ch"><span>Famille</span><select class="sel" data-x="f">${Object.entries(FAM).map(([k,F])=>`<option value="${k}" ${k===p.f?"selected":""}>${esc2(F.n)}</option>`).join("")}</select></label><label class="ch"><span>Cote devis</span><input type="text" data-x="cote" value="${esc2(p.cote)}"></label>`;
  t.querySelectorAll("[data-x]").forEach(e=>{const k=e.dataset.x;e.oninput=e.onchange=()=>{p[k]=e.value;sched();if(k==="f")draw();else liste()}});f.appendChild(t);
  FAM[p.f].g.forEach(([titre,cs])=>{const g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>${esc2(titre)}</h3>`;const d=document.createElement("div");d.className="champs";cs.forEach(c=>d.appendChild(champ(p,c)));g.appendChild(d);f.appendChild(g)});
  if(ETF.includes(p.f)){f.appendChild(habBloc(p));f.appendChild(coupeBloc(p));f.appendChild(etBloc(p))}
  f.appendChild(fixBloc(p));if(!ETF.includes(p.f))f.appendChild(coupeBloc(p));
  f.appendChild(photoBloc(p));
  if(!ro()){const z=document.createElement("div");z.className="acts";z.innerHTML=`<button type="button" class="b2" data-a="dup">Dupliquer ce produit</button><button type="button" class="b2 rouge" data-a="del">Supprimer ce produit</button>`;
    z.querySelector('[data-a="dup"]').onclick=()=>{const c=JSON.parse(JSON.stringify(p));c.k=Math.random().toString(36).slice(2,9);c.ann=[];c.ph=[];c.r=p.r+" (copie)";S.mt.prod.splice(S.cur+1,0,c);S.cur++;sched();draw();$m("mtfiche").scrollTop=0};
    z.querySelector('[data-a="del"]').onclick=()=>{if(!confirm("Supprimer « "+(p.r||p.d)+" » du métré ?"))return;S.mt.prod.splice(S.cur,1);S.cur=Math.min(S.cur,S.mt.prod.length-1);if(S.cur<0)S.cur=-2;sched();draw()};f.appendChild(z)}}
function champ(p,c){const w=document.createElement("div");w.className="ch"+(c.t==="t"&&/^Accès|Façade|Pignons/.test(c.l)?" large":"")+(!c.opt&&!fait(p,c)?" vide":"");w.innerHTML=`<span>${esc2(c.l)}${c.opt?' <small>(si besoin)</small>':""}</span>`;
  const set=v=>{p.v[c.l]=v;sched();liste()};
  if(c.t==="mm"){const d=document.createElement("div");d.className="mm";const i=document.createElement("input");i.type="text";i.inputMode="numeric";i.value=p.v[c.l]||"";i.setAttribute("aria-label",c.l);
    i.oninput=()=>{set(i.value.replace(/\D/g,""));i.value=p.v[c.l];w.classList.toggle("vide",!c.opt&&!i.value)};i.onchange=()=>{if(/Tableau|Isolation|isolation/.test(c.l))redraw()};d.append(i,Object.assign(document.createElement("em"),{textContent:"mm"}));w.appendChild(d)}
  if(c.t==="t"){const i=document.createElement("input");i.type="text";i.value=p.v[c.l]||"";i.setAttribute("aria-label",c.l);i.oninput=()=>{set(i.value);w.classList.toggle("vide",!c.opt&&!i.value)};w.appendChild(i)}
  if(c.t==="cmd"){const L=+p.v["Tableau L"],H=+p.v["Tableau H"],J=S.mt.jeu,prop=L&&H?`${L-2*J.c} × ${H-J.t}`:"";const i=document.createElement("input");i.type="text";i.value=p.v[c.l]||"";i.placeholder=prop||"L × H";i.setAttribute("aria-label",c.l);
    i.oninput=()=>{set(i.value);w.classList.toggle("vide",!i.value)};const h=document.createElement("small");h.className="sub";
    h.innerHTML=prop?`Calcul : tableau − ${J.c} mm par côté, − ${J.t} mm en tête = <b>${prop}</b> `:"Saisissez le tableau pour avoir le calcul";
    if(prop&&!ro()&&p.v[c.l]!==prop){const b=document.createElement("button");b.type="button";b.className="b2 mini";b.textContent="Reprendre";b.onclick=()=>{set(prop);draw()};h.appendChild(b)}w.append(i,h)}
  if(c.t==="n"){const d=document.createElement("div");d.className="pas";const v=()=>+p.v[c.l]||0;d.innerHTML=`<button type="button" aria-label="moins">−</button><b>${v()||"–"}</b><button type="button" aria-label="plus">+</button>`;const[m,,pl]=d.children;m.onclick=()=>{set(Math.max(0,v()-1)||"");draw()};pl.onclick=()=>{set(v()+1);draw()};w.appendChild(d)}
  if(c.t==="c"||c.t==="m"){const d=document.createElement("div");d.className="seg";c.o.forEach(o=>{const b=document.createElement("button");b.type="button";b.textContent=o;const on=c.t==="m"?(p.v[c.l]||[]).includes(o):p.v[c.l]===o;b.setAttribute("aria-pressed",on);
    b.onclick=()=>{if(c.t==="m"){const a=new Set(p.v[c.l]||[]);a.has(o)?a.delete(o):a.add(o);set([...a])}else set(p.v[c.l]===o?"":o);draw()};d.appendChild(b)});w.appendChild(d)}
  return w}
function sel(opts,val,lab,on){const e=document.createElement("select");e.className="sel";e.setAttribute("aria-label",lab);e.innerHTML=`<option value="">${esc2(lab)}…</option>`+opts.map(o=>`<option ${o===val?"selected":""}>${esc2(o)}</option>`).join("");e.onchange=()=>on(e.value);return e}
function segIn(lab,opts,get,setv,multi){const w=document.createElement("div");w.className="ch";w.innerHTML=`<span>${esc2(lab)}</span>`;const d=document.createElement("div");d.className="seg";
  opts.forEach(o=>{const b=document.createElement("button");b.type="button";b.textContent=o;const v=get()||(multi?[]:"");b.setAttribute("aria-pressed",multi?v.includes(o):v===o);b.onclick=()=>{if(multi){const a=new Set(get()||[]);a.has(o)?a.delete(o):a.add(o);setv([...a])}else setv(get()===o?"":o);sched();draw()};d.appendChild(b)});w.appendChild(d);return w}
function habBloc(p){const g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>Habillages</h3><p class="sub">Autant de lignes que nécessaire : plats et cornières de dimensions et de coloris différents. La longueur est calculée sur le tableau.</p>`;
  const[L,H]=dims(p);
  p.hab.forEach((h,k)=>{const r=document.createElement("div");r.className="hl";const ml=L&&H&&HAB_POS[h.pos]?HAB_POS[h.pos](L,H):0;
    r.append(sel(Object.keys(HAB_POS),h.pos,"Position",v=>{h.pos=v;sched();draw()}),sel(HAB_PROF,h.p,"Profil",v=>{h.p=v;sched();draw()}),sel(HAB_COLS,h.c,"Coloris",v=>{h.c=v;sched();draw()}));
    const m=document.createElement("span");m.className="ml";m.textContent=ml?mlf(ml):"–";const x=document.createElement("button");x.type="button";x.className="x";x.textContent="×";x.setAttribute("aria-label","Retirer cet habillage");x.onclick=()=>{p.hab.splice(k,1);sched();draw()};r.append(m,x);g.appendChild(r);
    if(h.c==="Autre RAL"){const i=document.createElement("input");i.type="text";i.placeholder="RAL ou référence du coloris";i.value=h.r||"";i.oninput=()=>{h.r=i.value;sched()};g.appendChild(i)}});
  const a=document.createElement("button");a.type="button";a.className="plus";a.textContent="+ Ajouter un habillage";a.onclick=()=>{p.hab.push({pos:"",p:"",c:"",r:""});sched();draw()};g.appendChild(a);return g}
function etBloc(p){const e=p.et,g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>Étanchéité et options de pose</h3>`;const d=document.createElement("div");d.className="champs";
  d.append(segIn("Compribande",[...Object.keys(COMP),"Aucune"],()=>e.comp,v=>e.comp=v),segIn("Silicone extérieur : teinte",SIL,()=>e.silE,v=>e.silE=v),segIn("Silicone intérieur",["Blanc","Idem ext.","Aucun"],()=>e.silI,v=>e.silI=v),
    segIn("Mousse PU",["Normale","Coupe-feu","Aucune"],()=>e.mou,v=>e.mou=v),segIn("Membrane",["Aucune","ME111","ME220","Techpro intérieure"],()=>e.mem,v=>e.mem=v),
    segIn("Options",["Création de rejingot","Délignage des cochonnets","Modification du sol intérieur"],()=>e.opt,v=>e.opt=v,true));
  g.appendChild(d);
  if((e.opt||[]).includes("Modification du sol intérieur")){const w=document.createElement("div");w.className="ch";w.innerHTML="<span>Hauteur de modification du sol</span>";const m=document.createElement("div");m.className="mm";const i=document.createElement("input");i.type="text";i.inputMode="numeric";i.value=e.sol||"";i.oninput=()=>{e.sol=i.value.replace(/\D/g,"");i.value=e.sol;sched()};m.append(i,Object.assign(document.createElement("em"),{textContent:"mm"}));w.appendChild(m);g.appendChild(w)}
  return g}
function fixBloc(p){const g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>Fixations</h3>`;
  p.fix.forEach((v,k)=>{const r=document.createElement("div");r.className="hl";const q=document.createElement("input");q.type="text";q.inputMode="numeric";q.placeholder="Qté";q.value=v.q||"";q.setAttribute("aria-label","Quantité");q.oninput=()=>{v.q=q.value.replace(/\D/g,"");q.value=v.q;sched()};
    const x=document.createElement("button");x.type="button";x.className="x";x.textContent="×";x.setAttribute("aria-label","Retirer");x.onclick=()=>{p.fix.splice(k,1);sched();draw()};
    r.append(sel(Object.keys(VIS),v.t,"Type",t=>{v.t=t;v.l=String((VIS[t]||[""])[0]);sched();draw()}),sel((VIS[v.t]||[]).map(n=>n==="—"?"—":n+" mm"),v.l==="—"?"—":v.l+" mm","Longueur",l=>{v.l=l.replace(" mm","");sched()}),q,document.createElement("span"),x);g.appendChild(r)});
  const a=document.createElement("button");a.type="button";a.className="plus";a.textContent="+ Ajouter une fixation";a.onclick=()=>{p.fix.push({t:"Vis béton",l:"80",q:""});sched();draw()};g.appendChild(a);return g}
function photoBloc(p){const g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>Photos et remarques</h3>`;const ph=document.createElement("div");ph.className="photo";
  if(!ro()){const l=document.createElement("label");l.textContent="📷 Photo";const i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=true;i.hidden=true;
    i.onchange=async()=>{for(const fl of i.files){try{const b=await shrink(fl,3000,.88);const r=await assets.upload(new File([b],"metre-"+(p.r||"photo")+".jpg",{type:"image/jpeg"}));p.ph.push(r.id);sched();draw()}catch(_){toast("Photo non envoyée (réseau ?)")}}};l.appendChild(i);ph.appendChild(l)}
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
function trace(p,keys,plus){const par={};p.hab.forEach(h=>couvre(h.pos).forEach(sp=>{(par[sp]=par[sp]||[]).push(h)}));let o="";
  keys.forEach(sp=>{const G=GEO[sp],hs=par[sp]||[];
    hs.forEach((h,n)=>{const d=n*6,pts=/^Plat/.test(h.p)?G.pl(d):G.c(d);o+=`<polyline points="${pts}" fill="none" stroke="#1f5fbf" stroke-width="4.5"/>`;
      const t=(h.p||"profil ?").replace(/^Cornière |^Plat /,"")+" · "+(h.c==="Autre RAL"?(h.r||"RAL ?"):(h.c||"coloris ?"));o+=`<text x="${G.lx}" y="${G.ly+n*14}" font-size="10.5" font-weight="700" fill="#1f5fbf">${esc2(t)}</text>`});
    if(!hs.length&&plus)o+=`<g class="hs" tabindex="0" role="button" data-sp="${sp}" aria-label="Ajouter un habillage ${SPOT[sp]}"><circle cx="${G.hx}" cy="${G.hy}" r="11" fill="#fff" stroke="#9aa3b0" stroke-dasharray="3 2"/><text x="${G.hx}" y="${G.hy+5}" text-anchor="middle" font-size="16" fill="#566070">+</text></g>`});return o}
const HACH=id=>`<defs><pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#9aa3b0" stroke-width="1.2"/></pattern></defs>`;
function svgV(p,plus,u){const reno=/Réno/.test(p.v["Type de pose"]||p.v["Dormant"]||""),iso=+p.v["Épaisseur d'isolation (doublage)"]||0;
  return`<svg viewBox="0 0 320 440" role="img" aria-label="Coupe verticale">${HACH("hv"+u)}<text x="14" y="18" font-size="11" font-weight="700" fill="#566070">EXT.</text><text x="280" y="18" font-size="11" font-weight="700" fill="#566070">INT.</text>
  <rect x="40" y="26" width="130" height="90" fill="url(#hv${u})" stroke="#10407e"/>${iso?`<rect x="170" y="26" width="28" height="90" fill="#f3e6a6" stroke="#10407e"/><text x="184" y="70" font-size="9" text-anchor="middle" fill="#566070" transform="rotate(-90 184 70)">doublage ${iso}</text>`:""}
  ${reno?`<rect x="143" y="116" width="9" height="208" fill="#d9c7a5" stroke="#8a7350"/>`:""}<rect x="${reno?152:148}" y="116" width="22" height="208" fill="#7d8794"/><line x1="${reno?163:159}" y1="132" x2="${reno?163:159}" y2="308" stroke="#7fb0e0" stroke-width="3"/>
  <rect x="40" y="324" width="130" height="100" fill="url(#hv${u})" stroke="#10407e"/>${iso?`<rect x="170" y="324" width="28" height="100" fill="#f3e6a6" stroke="#10407e"/>`:""}<polygon points="10,330 40,324 40,334 10,338" fill="#c9d1dc"/>
  ${reno?`<text x="60" y="436" font-size="9" fill="#8a7350">beige : ancien dormant conservé (réno)</text>`:""}${trace(p,["he","be","hi","bi"],plus)}</svg>`}
function svgH(p,plus,u){const reno=/Réno/.test(p.v["Type de pose"]||p.v["Dormant"]||""),iso=+p.v["Épaisseur d'isolation (doublage)"]||0;
  return`<svg viewBox="0 0 320 300" role="img" aria-label="Coupe horizontale">${HACH("hh"+u)}<text x="280" y="22" font-size="11" font-weight="700" fill="#566070">EXT.</text><text x="280" y="290" font-size="11" font-weight="700" fill="#566070">INT.</text>
  <rect x="20" y="40" width="120" height="${iso?110:150}" fill="url(#hh${u})" stroke="#10407e"/>${iso?`<rect x="20" y="150" width="120" height="50" fill="#f3e6a6" stroke="#10407e"/><text x="80" y="180" font-size="9" text-anchor="middle" fill="#566070">doublage ${iso}</text>`:""}
  ${reno?`<rect x="140" y="118" width="34" height="9" fill="#d9c7a5" stroke="#8a7350"/>`:""}<rect x="140" y="127" width="34" height="24" fill="#7d8794"/><line x1="174" y1="139" x2="312" y2="139" stroke="#7fb0e0" stroke-width="3"/>${trace(p,["me","mi"],plus)}</svg>`}
// les annotations sont gardées en coordonnées relatives (0 à 1) d'un cadre de proportions fixes : même dessin à l'écran et à l'impression
const coupesHtml=(p,plus,u)=>{const et=ETF.includes(p.f);return`<div class="coupes${et?"":" seul"}">${et?`<div class="pan"><h4>Coupe verticale (haut / bas)</h4>${svgV(p,plus,u)}</div><div class="pan"><h4>Coupe horizontale (tableau)</h4>${svgH(p,plus,u)}</div>`:""}<div class="pan grille"><h4>Croquis</h4></div></div>`};
const annSvg=p=>`<svg class="annsvg" viewBox="0 0 1000 1000" preserveAspectRatio="none">${p.ann.map(s=>`<polyline points="${s.p.split(" ").map(xy=>xy.split(",").map(n=>Math.round(n*1000)).join(",")).join(" ")}" fill="none" stroke="${COUL[s.c]||"#c0392b"}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`).join("")}</svg>`;
function coupeBloc(p){const g=document.createElement("section");g.className="grp";const et=ETF.includes(p.f);
  g.innerHTML=`<h3>${et?"Coupes de principe et croquis":"Croquis"}</h3><p class="sub">${et?"Les habillages choisis se dessinent à leur place ; touchez un + pour en ajouter un. ":""}Touchez « Annoter » pour dessiner par-dessus, au doigt ou au stylet ; touchez-le à nouveau pour faire défiler la page.</p>`;
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
  z.querySelectorAll(".hs").forEach(h=>{const add=()=>{p.hab.push({pos:SPOT[h.dataset.sp],p:"",c:"",r:""});sched();draw()};h.onclick=add;h.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();add()}}});
  g.append(tb,z);requestAnimationFrame(paint);if(window.ResizeObserver)new ResizeObserver(paint).observe(z);return g}

// ---------- ajout d'un produit ----------
function ajout(f){f.innerHTML=`<div class="ftete"><h2>Ajouter un produit</h2></div>${ro()?`<p class="sub">Lecture seule.</p>`:`<section class="grp"><div class="champs">
  <label class="ch"><span>Repère (pièce)</span><input type="text" id="mtar" placeholder="ex. Séjour"></label><label class="ch large"><span>Désignation</span><input type="text" id="mtad" placeholder="ex. Fenêtre 2 vantaux PVC 1200 × 1350"></label>
  <label class="ch"><span>Famille</span><select class="sel" id="mtaf">${Object.entries(FAM).map(([k,F])=>`<option value="${k}">${esc2(F.n)}</option>`).join("")}</select></label><label class="ch"><span>Cote devis</span><input type="text" id="mtac" placeholder="L × H"></label></div>
  <button type="button" class="b1" id="mtaok">Ajouter</button></section>${S.mt.prod.length?"":`<p class="sub">Aucun produit pour l'instant. Astuce : si le chantier a déjà un métré PDF pré-rempli, ses lignes sont reprises à la création.</p>`}`}`;
  if(ro())return;$m("mtad").oninput=()=>{$m("mtaf").value=famGuess($m("mtad").value)};
  $m("mtaok").onclick=()=>{const r=$m("mtar").value.trim(),d=$m("mtad").value.trim();if(!r&&!d){$m("mtar").focus();return}
    S.mt.prod.push(newProd(r,d,$m("mtaf").value,$m("mtac").value.trim()));S.cur=S.mt.prod.length-1;sched();draw()}}

// ---------- consommables du chantier (mêmes calculs que le métré PDF) ----------
function totaux(){const sil={},comp={},hab={},vis={},manque=[];let mou=0;
  S.mt.prod.forEach(p=>{const[L,H]=dims(p),per=2*(L+H),e=p.et;if(!ETF.includes(p.f))return;if(!L||!H){manque.push((p.r||"?")+" · "+p.d);return}
    if(e.silE)sil[e.silE+" (ext.)"]=(sil[e.silE+" (ext.)"]||0)+per;
    if(e.silI&&e.silI!=="Aucun"){const c=(e.silI==="Idem ext."?(e.silE||"teinte ?"):e.silI)+" (int.)";sil[c]=(sil[c]||0)+per}
    if(COMP[e.comp])comp[e.comp]=(comp[e.comp]||0)+per;if(e.mou&&e.mou!=="Aucune")mou++;
    p.hab.forEach(h=>{if(!h.p||!HAB_POS[h.pos]||h.p==="Fourni menuiserie")return;const k=h.p+" · "+(h.c==="Autre RAL"?(h.r||"RAL à préciser"):h.c||"coloris à choisir");hab[k]=(hab[k]||0)+HAB_POS[h.pos](L,H)})});
  S.mt.prod.forEach(p=>p.fix.forEach(v=>{if(!v.t)return;const k=v.t+(v.l&&v.l!=="—"?" "+v.l+" mm":"");vis[k]=(vis[k]||0)+(+v.q||0)}));
  const pl=(n,a,b)=>n+" "+(n>1?b:a);
  const rows=[...Object.entries(sil).map(([k,m])=>["Silicone "+k,pl(Math.ceil(m/1000/12),"cartouche","cartouches"),mlf(m)]),...Object.entries(comp).map(([k,m])=>["Compribande "+k,pl(Math.ceil(m/1000/COMP[k]),"rouleau","rouleaux"),mlf(m)]),
    ...(mou?[["Mousse PU","pour "+pl(mou,"produit","produits"),""]]:[]),...Object.entries(hab).map(([k,m])=>["Habillage "+k,mlf(m),""]),...Object.entries(vis).map(([k,n])=>[k,n+" u",""])];
  return{rows,manque}}
function recap(f){const{rows,manque}=totaux();
  f.innerHTML=`<div class="ftete"><h2>Consommables du chantier</h2></div><p class="sub">Périmètre du tableau ; 12 ml de joint par cartouche de silicone ; rouleaux de compribande selon la dimension (3x7 = 8 m, 4x11 = 5,6 m, 5x14 = 4,3 m, 9x20 = 12 m) ; habillages au mètre linéaire.</p>
   <section class="grp">${rows.length?`<table class="rc"><thead><tr><th>Article</th><th>Quantité</th><th>Linéaire</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc2(r[0])}</td><td class="n">${esc2(r[1])}</td><td>${esc2(r[2])}</td></tr>`).join("")}</tbody></table>`:`<p class="sub">Rien à compter pour l'instant : choisissez l'étanchéité, les habillages et les fixations dans les fiches.</p>`}</section>
   ${manque.length?`<div class="alerte">Pas encore compté (tableau à saisir) : ${manque.map(esc2).join(", ")}</div>`:""}`}

// ---------- impression / PDF ----------
function imprimer(){const j=jobs.get(S.jid)||{},P=S.mt.prod,{rows}=totaux();
  const val=v=>Array.isArray(v)?v.join(", "):v;
  const fiche=(p,k)=>{const ch=fields(p).filter(c=>fait(p,c)).map(c=>`<tr><th>${esc2(c.l)}</th><td>${esc2(val(p.v[c.l]))}${c.t==="mm"?" mm":""}</td></tr>`).join("");
    const e=p.et,et=ETF.includes(p.f)?[["Compribande",e.comp],["Silicone ext.",e.silE],["Silicone int.",e.silI],["Mousse PU",e.mou],["Membrane",e.mem],["Options",(e.opt||[]).join(", ")+(e.sol?" ("+e.sol+" mm)":"")]].filter(x=>x[1]).map(x=>`<tr><th>${x[0]}</th><td>${esc2(x[1])}</td></tr>`).join(""):"";
    const[L,H]=dims(p),hab=p.hab.filter(h=>h.p).map(h=>`<tr><th>${esc2(h.pos||"?")}</th><td>${esc2(h.p)} · ${esc2(h.c==="Autre RAL"?h.r:h.c)}${L&&H&&HAB_POS[h.pos]?" · "+mlf(HAB_POS[h.pos](L,H)):""}</td></tr>`).join("");
    const fx=p.fix.filter(v=>v.t).map(v=>`${esc2(v.t)}${v.l&&v.l!=="—"?" "+v.l+" mm":""}${v.q?" : "+v.q:""}`).join(" · ");
    return`<section class="pp"><h2>${k+1}. ${esc2(p.r)} <small>${esc2(p.d)} · ${esc2(FAM[p.f].n)}${p.cote?" · cote devis "+esc2(p.cote):""}</small></h2>
     <div class="pg2"><table>${ch}${et}</table><div>${hab?`<table><tr><th colspan="2">Habillages</th></tr>${hab}</table>`:""}${fx?`<p><b>Fixations :</b> ${fx}</p>`:""}${p.v.rem?`<p><b>Remarque :</b> ${esc2(p.v.rem)}</p>`:""}${p.ph.length?`<p>${p.ph.length} photo${p.ph.length>1?"s":""} dans l'appli</p>`:""}</div></div>
     <div class="cw">${coupesHtml(p,false,"p"+k).replace(/<\/div>$/,annSvg(p)+"</div>")}</div></section>`};
  const box=$m("mtprint");box.innerHTML=`<header><b>MGDS · Métré</b><span>${esc2(j.client||"")}<br>${esc2([j.adresse,j.ville].filter(Boolean).join(", "))}</span><span>Jeu de pose ${S.mt.jeu.c} mm / côté, ${S.mt.jeu.t} mm en tête<br>Imprimé le ${new Date().toLocaleDateString("fr-FR")}</span></header>
    ${P.map(fiche).join("")}<section class="pp"><h2>Consommables du chantier</h2><table>${rows.map(r=>`<tr><th>${esc2(r[0])}</th><td>${esc2(r[1])}</td><td>${esc2(r[2])}</td></tr>`).join("")}</table></section>`;
  document.body.classList.add("mtprinting");const fin=()=>{document.body.classList.remove("mtprinting");removeEventListener("afterprint",fin)};addEventListener("afterprint",fin);setTimeout(()=>window.print(),50)}

// redessin après une cote : attendu jusqu'à la fin du toucher en cours (sinon le bouton touché disparaît sous le doigt)
let doigt=false,aRedessiner=false;
function redraw(){if(!S)return;if(doigt){aRedessiner=true;return}draw()}
addEventListener("pointerdown",()=>{doigt=true},true);
const lache=()=>setTimeout(()=>{doigt=false;if(aRedessiner&&S){aRedessiner=false;draw()}},0);
addEventListener("click",lache,true);addEventListener("pointercancel",lache,true);addEventListener("pointerup",()=>setTimeout(lache,350),true);
// ---------- fenêtre ----------
const css=`#mtov{position:fixed;inset:0;z-index:60;background:var(--bg,#f5f5f7);color:var(--ink,#1d1d1f);display:grid;grid-template-rows:auto 1fr;font-size:16px}
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
#mtov .ajout{font:600 14px inherit;border:1.5px dashed var(--muted,#6e6e73);border-radius:12px;padding:10px;background:none;color:var(--ink,#1d1d1f);cursor:pointer}
#mtov .fiche{padding:14px 18px 40px;display:grid;gap:14px;align-content:start;overflow:auto;-webkit-overflow-scrolling:touch}
#mtov .ftete{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}#mtov .ftete h2{margin:0;font-size:22px;color:#10407e}
#mtov .grp{border:1px solid var(--line,#e3e3e8);border-radius:14px;padding:12px 14px;display:grid;gap:12px;background:var(--surface,#fff)}
#mtov .grp h3{font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:#10407e;margin:0}#mtov .sub{font-size:13px;color:var(--muted,#6e6e73);margin:0}
#mtov .champs{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px 16px}
#mtov .ch{display:grid;gap:5px;align-content:start;min-width:0}#mtov .ch>span{font-size:14px;font-weight:600}#mtov .ch small{font-weight:400;color:var(--muted,#6e6e73)}#mtov .ch.large{grid-column:1/-1}
#mtov .ch.vide>span::after{content:" •";color:#c96a2c}
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
.coupes{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;aspect-ratio:3/1.5}.coupes.seul{grid-template-columns:1fr;aspect-ratio:2.2/1}
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
