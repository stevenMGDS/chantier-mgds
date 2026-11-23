// ---------- Fiches de chantier au format téléphone, pour les poseurs (Steven, 23/11/2026) ----------
// Préparation : tout sur un seul écran (client, accès, pose prévue, ce que le bureau a rempli dans la fiche PDF, habillages,
// seuils, options, consommables et croquis du métré tablette), sans les dimensions. La fiche PDF reste consultable.
// Réception : en 5 étapes à gros boutons (chantier, points communs, produit par produit selon sa famille, réserves avec photo
// et dictée, signatures du client et du chef d'équipe). À la fin, un PDF daté est rangé comme fiche Réception (une version par
// modification, copiée sur le serveur par fiches_pose.py) et l'étape « Réceptionné » est cochée.
// Utilise les fonctions de poseurs.html (sb, me, role, chantiers, openId, esc, toast, shrink, appCam, loadPlanning…) et metre.js.
(()=>{
const $f=id=>document.getElementById(id);
const pad2=n=>String(n).padStart(2,"0"),isoJ=d=>d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
const frD=s=>s?new Date(s.length===10?s+"T12:00":s).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"}):"";
const pdfTxt=s=>String(s??"").replace(/[→⇒]/g,"->").replace(/[✓✔]/g,"OK").replace(/[•·]/g,"-").replace(/[^\x20-\x7E\xA0-\xFF\n€œŒ’‘“”–—…]/g,"");

// ---------- fenêtre plein écran (retour arrière = fermer) ----------
function ecran(titre,html,outils=""){const m=document.createElement("div");m.className="modal ftel";
  m.innerHTML=`<div><div class="ftbar"><button class="btn ghost" data-ftx>◀ Retour</button><b>${esc(titre)}</b>${outils}</div><div class="ftcorps">${html}</div></div>`;
  document.body.appendChild(m);history.pushState({ftel:1},"");m.querySelector("[data-ftx]").onclick=()=>history.back();return m}

// ---------- lecture d'une fiche PDF remplie : ce que le bureau y a écrit ou coché, rangé par rubrique ----------
async function lireFiche(doc){
  const{data,error}=await sb.storage.from("documents").download(doc.id);if(error)throw error;
  pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf=await pdfjsLib.getDocument({data:await data.arrayBuffer()}).promise,out=[];
  for(let n=1;n<=pdf.numPages;n++){const pg=await pdf.getPage(n),tc=await pg.getTextContent(),an=await pg.getAnnotations();
    const T=tc.items.filter(t=>t.str.trim()&&t.str.trim()!=="☐").map(t=>({s:t.str.trim(),x:t.transform[4],y:t.transform[5],w:t.width||0,h:Math.abs(t.transform[3])||8}));
    // rubriques des modèles de fiches (préparation, réception) ; au-dessus de la première : « Le chantier » (page 1) ou « Consommables »
    const titres=T.filter(t=>/^(ACCÈS ET CLIENT|CE QU.ON POSE|ATTENTION À|JOINT AU DOSSIER|RÉUNION PLANNING|MANQUANTS|MGDS · CONSOMMABLES|AUTOCONTRÔLE|A\. AUTOCONTRÔLE|B\. VISITE|CONTRÔLE PAR MENUISERIE|REMARQUES|SIGNATURES)/i.test(t.s)).sort((a,b)=>b.y-a.y);
    const rub=y=>{let r=null;for(const t of titres)if(t.y>y+2&&(!r||t.y<r.y))r=t;return r?r.s.replace(/^MGDS · /,"").replace(/\s{2,}.*$/,"").replace(/\s+(repris|relevés|préparée|à reporter).*$/i,""):n===1?"Le chantier":"Consommables"};
    const lab=s=>s.replace(/☐/g,"").replace(/\.{2,}|…+/g,"").replace(/\(\s*[^()]*:\s*\)/g,"").replace(/\s*:\s*$/,"").replace(/\s{2,}/g," ").trim();
    for(const a of an){if(a.subtype!=="Widget"||!a.fieldName)continue;const[x1,y1,x2,y2]=a.rect,cy=(y1+y2)/2;
      const ligne=T.filter(t=>Math.abs(t.y+t.h/3-cy)<6);
      if(a.checkBox){const v=a.fieldValue;if(!v||v==="Off")continue;
        let t=ligne.filter(t=>t.x>=x2-1).sort((p,q)=>p.x-q.x)[0];if(!t||t.x-x2>40)t=ligne.sort((p,q)=>p.x-q.x)[0];
        const l=t?lab(t.s.split(/☐/)[0]):"";if(l)out.push({r:rub(cy),c:1,l})}
      else{const v=String(a.fieldValue??"").trim();if(!v)continue;
        let t=ligne.filter(t=>t.x+t.w<=x1+4).sort((p,q)=>(q.x+q.w)-(p.x+p.w))[0];
        if(!t)t=T.filter(t=>t.y>y2-2&&t.y<y2+16&&t.x<x2&&t.x+t.w>x1).sort((p,q)=>p.y-q.y)[0];
        out.push({r:rub(cy),l:t?lab(t.s):"",v})}}
    // remarques imprimées par Claude (« – Volets motorisés… »)
    T.filter(t=>/^[–-]\s/.test(t.s)&&t.s.length>12).forEach(t=>out.push({r:rub(t.y),note:t.s.replace(/^[–-]\s*/,"")}))}
  const R=new Map();out.forEach(o=>{if(!R.has(o.r))R.set(o.r,[]);R.get(o.r).push(o)});return R}

// ---------- PRÉPARATION ----------
async function prepTel(d,j){const id=openId;
  const m=ecran("Préparation · "+(j.client||id),`<p class="sub">Chargement…</p>`,`<button class="btn ghost" data-ftpdf>📄 PDF</button>`);
  m.querySelector("[data-ftpdf]").onclick=()=>{history.back();setTimeout(()=>openFill(d.id,false),50)};
  const corps=m.querySelector(".ftcorps"),addr=addrOf(j),tel=(j.tel||"").replace(/[^\d+]/g,"");
  let pl=[];try{const t=new Date();pl=(await loadPlanning(isoJ(new Date(t.getTime()-86400000*3)),isoJ(new Date(t.getTime()+86400000*90)))).filter(p=>p.chantier===id)}catch(_){}
  const jours=[...new Set(pl.map(p=>p.jour))].sort(),qui=[...new Set(pl.map(p=>nameOf(p.poseur)))].filter(x=>x&&x!=="?");
  let R=null,err="";try{if(/\.pdf$/i.test(d.name||d.id))R=await lireFiche(d)}catch(e){err="La fiche PDF n'a pas pu être lue."}
  const mt=(j.docs||[]).find(x=>x.mt);
  let h=`<section class="ftc"><h2>${esc(j.clientNom||j.client||id)}</h2>
    ${addr?`<p>📍 ${esc(addr)}</p>`:""}<div class="ftacts">${addr?`<a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}" target="_blank" rel="noopener">Itinéraire</a>`:""}${tel?`<a class="btn ghost" href="tel:${esc(tel)}">Appeler le client</a>`:""}</div>
    <p><b>Pose prévue :</b> ${jours.length?jours.map(frD).join(", "):"pas encore au planning"}${qui.length?` · ${esc(qui.join(", "))}`:""}${+j.jp?` · ${String(j.jp).replace(".",",")} jour${+j.jp>1?"s":""} prévu${+j.jp>1?"s":""} (équipe de 2)`:""}</p>
    ${j.commercial?`<p class="sub">Contact MGDS : ${esc(j.commercial)}</p>`:""}</section>`;
  if(R&&R.size){for(const[r,L]of R){const notes=L.filter(o=>o.note),vals=L.filter(o=>!o.note&&!o.c&&o.l),coch=L.filter(o=>o.c);if(!notes.length&&!vals.length&&!coch.length)continue;
      h+=`<section class="ftc"><h3>${esc(r===r.toUpperCase()?r.charAt(0)+r.slice(1).toLowerCase():r)}</h3>${vals.map(o=>`<p><b>${esc(o.l)}</b> : ${esc(o.v)}</p>`).join("")}${coch.length?`<p class="ftchk">${coch.map(o=>`<span>☑ ${esc(o.l)}</span>`).join("")}</p>`:""}${notes.map(o=>`<p class="ftnote">⚠ ${esc(o.note)}</p>`).join("")}</section>`}}
  else h+=`<section class="ftc"><p class="sub">${err||"La fiche de préparation n'a pas encore été remplie par le bureau."}</p></section>`;
  if(mt&&window.mtPoseHtml)h+=`<section class="ftc ftmt"><div class="mtlire">${mtPoseHtml(mt.mt,j)}</div></section>`;
  else h+=`<section class="ftc"><p class="sub">Pas de métré tablette sur ce chantier : les habillages et croquis sont sur la fiche de métré.</p></section>`;
  corps.innerHTML=h}

// ---------- RÉCEPTION ----------
const COMMUNS=["Chantier propre, protections et films retirés","Déposes et emballages évacués","Photos prises de chaque produit posé","Notices et garanties remises au client"];
const REC={
 fen:["Pose d'aplomb et de niveau","Ouverture, oscillo-battant, fermeture sans point dur","Mastic extérieur continu, compribande en place","Calfeutrement intérieur, habillages, couvre-joints","Vitrage et profils sans rayure, étiquettes retirées","Grilles de ventilation posées","Trous d'évacuation dégagés","Volet intégré : manœuvre et fins de course"],
 mini:["Profils : laquage sans rayure, choc ni défaut (lumière rasante)","Rails et seuil propres, de niveau, sans gravats ni rayure","Vitrages sans rayure, éclat ni défaut de feuilleté","Joints de vantaux et de recouvrement continus","Vantaux glissent sans effort, butées et amortisseurs réglés","Verrouillage et poignées OK","Motorisation testée avec le client","Seuil affleurant, raccord avec le sol fini","Évacuation de l'eau testée (essai à l'eau)","Étanchéité périphérique et membrane EPDM en place","Photo de chaque vantail avant protection","Membrane de protection posée après ce contrôle"],
 porte:["Équerrage, jeux réguliers autour de l'ouvrant","Fermeture à clé sur tous les points, sans forcer","Seuil fixé et étanche","Joints continus, pas de passage d'air","Barre de tirage et béquille bien fixées","Habillages et finitions","Gâche électrique ou serrure connectée testée"],
 garage:["Tablier d'aplomb, rails bien fixés","Équilibrage : la porte tient seule à mi-hauteur","Fins de course réglées","Arrêt et remontée sur obstacle testés","Joint bas en contact avec le sol","Déverrouillage manuel montré au client"],
 occ:["Manœuvre complète testée avec le client","Fins de course réglées en haut et en bas","Toile ou tablier droit, sans pli ni rayure","Coulisses d'aplomb et fixées","Coffre fermé, câble protégé","Commande programmée et expliquée au client","Capteur vent ou soleil testé"],
 portail:["Vantaux d'aplomb, jeux réguliers","Ouverture et fermeture sans frottement","Arrêts et butée au sol en place","Serrure et clés OK","Moteur : fins de course et force réglées","Photocellules testées (arrêt, inversion), feu clignotant","Débrayage manuel montré au client"],
 veranda:["Structure d'aplomb et d'équerre","Solin et toiture étanches (essai à l'eau)","Chéneau et descentes raccordés, l'eau s'écoule","Vitrages et panneaux sans casse ni rayure","Coulissants et portes : manœuvre et serrures","Occultations et éclairage testés","Joints de mastic continus, vitrages nettoyés","Notice d'entretien remise"]};
const REC_Q={porte:"Clés remises",garage:"Télécommandes remises",occ:"Télécommandes remises",portail:"Télécommandes remises"};
const FAM_N={fen:"Fenêtres et baies",mini:"Coulissant minimaliste",porte:"Porte d'entrée",garage:"Porte de garage",occ:"Occultation",portail:"Portail",veranda:"Véranda"};
const famDe=p=>/minimal|keller|galandage|panoramah|cero\b/i.test((p.d||"")+" "+((p.v||{})["Gamme"]||""))?"mini":(REC[p.f]?p.f:"fen");
const ETAPES=["Le chantier","Pour tout le chantier","Produit par produit","Réserves du client","Signatures"];
function nouvelleRecep(j){const mt=(j.docs||[]).find(x=>x.mt);
  const prod=mt?(mt.mt.prod||[]).map(p=>({r:p.r||"",d:p.d||"",f:famDe(p),c:{},q:"",ph:[]})):[{r:"Chantier",d:"Menuiseries posées",f:"fen",c:{},q:"",ph:[]}];
  return{v:1,pt:{},ptNote:{},prod,res:[],avec:null,nom:j.clientNom||"",sigC:null,sigE:null,chef:me?nameOf(me):"",e:0}}
const cleBrouillon=(id,d)=>"recep-brouillon-"+id+"-"+d.id.slice(-12);

async function recepTel(d,j){const id=openId;let R;
  try{R=JSON.parse(localStorage.getItem(cleBrouillon(id,d))||"null")}catch(_){R=null}
  if(!R)R=d.recep?JSON.parse(JSON.stringify(d.recep)):nouvelleRecep(j);R.e=R.e||0;
  const m=ecran("Réception · "+(j.client||id),`<div class="ftprog" id="ftprog"></div><div id="ftrc"></div><div class="ftpied"><button class="btn ghost" id="ftprev">◀ Retour</button><button class="btn" id="ftnext">Suivant ▶</button></div>`,d.recep||/\.pdf$/i.test(d.name||"")?`<button class="btn ghost" data-ftpdf>📄 PDF</button>`:"");
  const pdfB=m.querySelector("[data-ftpdf]");if(pdfB)pdfB.onclick=()=>{history.back();setTimeout(()=>openFill(d.id,false),50)};
  const garde=()=>{try{localStorage.setItem(cleBrouillon(id,d),JSON.stringify(R))}catch(_){}};
  const urls={};const signe=async ch=>{if(urls[ch])return urls[ch];const r=await sb.storage.from("photos").createSignedUrl(ch,3600);return urls[ch]=r.data&&r.data.signedUrl};
  async function photos(onDone,note){const traiter=async fs=>{for(const f of fs){try{const b=await shrink(f);const ch=`${me}/${id}/fin/${Date.now()}-${Math.random().toString(36).slice(2,7)}.jpg`;
      const up=await sb.storage.from("photos").upload(ch,b,{contentType:"image/jpeg",upsert:false});if(up.error)throw up.error;
      await sb.from("photos").insert({chantier:id,categorie:"fin",chemin:ch,note:note||null});onDone(ch)}catch(_){toast("Photo non envoyée (réseau ?)")}}garde();dessine()};
    appCam(traiter,{titre:"Photo",repli:()=>{const i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=true;i.onchange=()=>traiter([...i.files]);i.click()}})}
  function dessine(){const c=$f("ftrc");if(!c)return;garde();
    $f("ftprog").innerHTML=`<div class="ftst">Étape ${R.e+1} sur 5 · <b>${ETAPES[R.e]}</b></div><div class="ftbarres">${ETAPES.map((_,k)=>`<i class="${k<=R.e?"on":""}"></i>`).join("")}</div>`;
    $f("ftprev").disabled=R.e===0;$f("ftnext").textContent=R.e===4?"Terminer et signer ✓":"Suivant ▶";let h="";
    if(R.e===0)h=`<section class="ftc"><h2>${esc(j.clientNom||j.client||id)}</h2><p>📍 ${esc(addrOf(j)||"")}</p><p class="sub">${R.prod.length} produit${R.prod.length>1?"s":""} à contrôler, d'après le métré.</p>
      <label class="ftl">Chef d'équipe<input type="text" data-r="chef" value="${esc(R.chef||"")}"></label></section>`;
    if(R.e===1)h=COMMUNS.map((p,k)=>{const v=R.pt[k];return`<section class="ftc ${v==="ok"?"ok":v==="nc"?"ko":""}"><b>${esc(p)}</b><div class="fttri">${[["ok","OK"],["nc","À reprendre"],["so","Sans objet"]].map(([x,l])=>`<button type="button" data-pt="${k}" data-v="${x}" aria-pressed="${v===x}">${l}</button>`).join("")}</div>${v==="nc"?`<input type="text" data-ptn="${k}" placeholder="Ce qu'il faut reprendre" value="${esc(R.ptNote[k]||"")}">`:""}</section>`}).join("");
    if(R.e===2)h=R.prod.map((p,k)=>{const L=REC[p.f]||REC.fen,tout=L.every(x=>p.c[x]);return`<section class="ftc ${tout?"ok":""}"><span class="ftfam">${esc(FAM_N[p.f]||"")}</span><b>${esc(p.r)} · <span style="font-weight:400">${esc(p.d)}</span></b>${p.f==="mini"?`<p class="ftnote">À faire avant la pose de la membrane de protection</p>`:""}
      <div class="ftchips">${L.map((x,n)=>`<button type="button" data-pc="${k}" data-n="${n}" aria-pressed="${!!p.c[x]}">${p.c[x]?"✓ ":""}${esc(x)}</button>`).join("")}</div>
      ${REC_Q[p.f]?`<label class="ftl">${REC_Q[p.f]}<input type="text" inputmode="numeric" data-pq="${k}" value="${esc(p.q||"")}"></label>`:""}
      <div class="ftph">${p.ph.map(ch=>`<img data-ch="${esc(ch)}" alt="Photo">`).join("")}<button type="button" class="btn ghost" data-pph="${k}">📷 Photo</button><button type="button" class="btn ghost" data-ptout="${k}">✓ Tout OK</button></div></section>`}).join("")+`<button type="button" class="btn ghost" id="ftaddp">＋ Ajouter un produit</button>`;
    if(R.e===3){const dict=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
      h=`<section class="ftc"><h3>Réserves du client</h3><p class="sub">Une réserve par ligne. 🎤 Dictez-les à la suite, en disant « suivante » entre deux réserves : chacune s'ajoute à la liste, puis le client la valide.</p>
       ${dict?`<button type="button" class="btn ftmic" id="ftmic">🎤 Dicter les réserves</button><p class="ftlive" id="ftlive"></p>`:`<p class="sub">Dictée : utilisez le micro du clavier dans la case ci-dessous.</p>`}
       <label class="ftl">Produit<select id="ftrp"><option value="">Général</option>${R.prod.map((p,k)=>`<option value="${k}">${esc(p.r+" · "+p.d)}</option>`).join("")}</select></label>
       <textarea id="ftrt" placeholder="Ex. rayure sur le dormant bas, à reprendre"></textarea><div class="ftacts"><button type="button" class="btn" id="ftradd">Ajouter la réserve</button></div></section>
       ${R.res.map((r,k)=>`<section class="ftc ko"><b>${k+1}. ${esc(r.p!=null&&R.prod[r.p]?R.prod[r.p].r:"Général")}</b><textarea data-rt="${k}">${esc(r.t)}</textarea><div class="ftph">${(r.ph||[]).map(ch=>`<img data-ch="${esc(ch)}" alt="Photo">`).join("")}<button type="button" class="btn ghost" data-rph="${k}">📷 Photo</button><button type="button" class="btn ghost" data-rdel="${k}">Retirer</button></div></section>`).join("")}
       ${R.res.length?"":`<p class="sub" style="padding:0 4px">Aucune réserve : passez à l'étape suivante.</p>`}`}
    if(R.e===4)h=`<section class="ftc"><div class="fttri">${[["sans","Sans réserve"],["avec","Avec réserves"]].map(([x,l])=>`<button type="button" data-avec="${x}" aria-pressed="${(R.avec===true&&x==="avec")||(R.avec===false&&x==="sans")}">${l}</button>`).join("")}</div>
       ${R.avec&&!R.res.length?`<p class="ftnote">Ajoutez les réserves à l'étape précédente.</p>`:""}${R.avec===false&&R.res.length?`<p class="ftnote">${R.res.length} réserve${R.res.length>1?"s":""} notée${R.res.length>1?"s":""} : choisissez « Avec réserves ».</p>`:""}
       <label class="ftl">Nom du client qui signe<input type="text" data-r="nom" value="${esc(R.nom||"")}"></label></section>
       <section class="ftc"><b>Signature du client</b><canvas class="ftsig" data-sig="sigC"></canvas><button type="button" class="btn ghost" data-sigx="sigC">Effacer</button></section>
       <section class="ftc"><b>Signature du chef d'équipe${R.chef?" ("+esc(R.chef)+")":""}</b><canvas class="ftsig" data-sig="sigE"></canvas><button type="button" class="btn ghost" data-sigx="sigE">Effacer</button></section>`;
    c.innerHTML=h;
    c.querySelectorAll("img[data-ch]").forEach(im=>signe(im.dataset.ch).then(u=>{if(u)im.src=u}));
    c.querySelectorAll("canvas[data-sig]").forEach(cv=>sig(cv,cv.dataset.sig));
    if(R.e===3)lierDictee()}
  function sig(cv,k){const r=cv.getBoundingClientRect(),dp=window.devicePixelRatio||1;cv.width=Math.max(300,r.width)*dp;cv.height=180*dp;const x=cv.getContext("2d");x.scale(dp,dp);x.lineWidth=2.6;x.lineCap="round";x.strokeStyle="#10407e";
    if(R[k]){const im=new Image();im.onload=()=>x.drawImage(im,0,0,cv.width/dp,180);im.src=R[k]}let on=false;
    const pos=e=>{const b=cv.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top]};
    cv.onpointerdown=e=>{on=true;cv.setPointerCapture(e.pointerId);const[a,b]=pos(e);x.beginPath();x.moveTo(a,b)};
    cv.onpointermove=e=>{if(on){const[a,b]=pos(e);x.lineTo(a,b);x.stroke()}};cv.onpointerup=()=>{on=false;R[k]=cv.toDataURL("image/png");garde()}}
  let reco=null;
  function lierDictee(){const b=$f("ftmic");if(!b)return;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    b.onclick=()=>{if(reco){reco.stop();return}reco=new SR();reco.lang="fr-FR";reco.continuous=true;reco.interimResults=true;b.textContent="⏹ Arrêter la dictée";b.classList.add("rec");
      reco.onresult=e=>{let fin="",tmp="";for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)fin+=t;else tmp+=t}
        $f("ftlive").textContent=tmp;if(fin){const p=$f("ftrp").value;fin.split(/\b(?:suivante|réserve suivante|point suivant)\b|[.;]\s*/i).map(s=>s.trim()).filter(s=>s.length>2).forEach(t=>R.res.push({t:t.charAt(0).toUpperCase()+t.slice(1),p:p===""?null:+p,ph:[]}));R.avec=true;garde();const live=$f("ftlive");dessine();if(live)$f("ftlive").textContent=""}};
      reco.onend=()=>{reco=null;const bb=$f("ftmic");if(bb){bb.textContent="🎤 Dicter les réserves";bb.classList.remove("rec")}};
      reco.onerror=e=>{toast(e.error==="not-allowed"?"Autorisez le micro pour la dictée.":"Dictée interrompue.")};reco.start()}}
  m.addEventListener("click",e=>{const t=e.target.closest("button");if(!t)return;
    if(t.dataset.pt!==undefined){R.pt[t.dataset.pt]=R.pt[t.dataset.pt]===t.dataset.v?null:t.dataset.v;dessine()}
    else if(t.dataset.pc!==undefined){const p=R.prod[+t.dataset.pc],x=(REC[p.f]||REC.fen)[+t.dataset.n];p.c[x]=!p.c[x];dessine()}
    else if(t.dataset.ptout!==undefined){const p=R.prod[+t.dataset.ptout];(REC[p.f]||REC.fen).forEach(x=>p.c[x]=true);dessine()}
    else if(t.dataset.pph!==undefined){const p=R.prod[+t.dataset.pph];photos(ch=>p.ph.push(ch),"Réception · "+p.r)}
    else if(t.dataset.rph!==undefined){const r=R.res[+t.dataset.rph];photos(ch=>(r.ph=r.ph||[]).push(ch),"Réserve : "+r.t)}
    else if(t.dataset.rdel!==undefined){R.res.splice(+t.dataset.rdel,1);dessine()}
    else if(t.dataset.avec){R.avec=t.dataset.avec==="avec";dessine()}
    else if(t.dataset.sigx){R[t.dataset.sigx]=null;dessine()}
    else if(t.id==="ftradd"){const v=$f("ftrt").value.trim();if(!v)return;const p=$f("ftrp").value;R.res.push({t:v,p:p===""?null:+p,ph:[]});R.avec=true;dessine()}
    else if(t.id==="ftaddp"){const n=prompt("Quel produit ? (pièce et type, ex. Cuisine · fenêtre)");if(n){R.prod.push({r:n.split("·")[0].trim(),d:(n.split("·")[1]||"").trim(),f:/porte d.entr/i.test(n)?"porte":/volet|store|bso/i.test(n)?"occ":/portail/i.test(n)?"portail":/garage/i.test(n)?"garage":"fen",c:{},q:"",ph:[]});dessine()}}
    else if(t.id==="ftprev"){if(R.e>0){R.e--;dessine();m.querySelector(".ftcorps").scrollTop=0}}
    else if(t.id==="ftnext"){if(R.e<4){R.e++;dessine();m.querySelector(".ftcorps").scrollTop=0}else terminer()}});
  m.addEventListener("input",e=>{const t=e.target;if(t.dataset.r)R[t.dataset.r]=t.value;else if(t.dataset.ptn!==undefined)R.ptNote[t.dataset.ptn]=t.value;else if(t.dataset.pq!==undefined)R.prod[+t.dataset.pq].q=t.value;else if(t.dataset.rt!==undefined)R.res[+t.dataset.rt].t=t.value;else return;garde()});
  async function terminer(){
    if(R.avec===null){toast("Choisissez « Sans réserve » ou « Avec réserves ».");return}
    if(R.avec===false&&R.res.length){toast("Des réserves sont notées : choisissez « Avec réserves ».");return}
    if(!R.nom.trim()){toast("Indiquez le nom du client qui signe.");return}
    if(!R.sigC||!R.sigE){toast("Il manque une signature (client et chef d'équipe).");return}
    const b=$f("ftnext");b.disabled=true;b.textContent="Création du PDF…";
    try{const bytes=await recepPdf(R,j,id);
      const path=`poseurs/${me}/${Date.now().toString(36)}-reception-${today()}.pdf`;
      const up=await sb.storage.from("documents").upload(path,new Blob([bytes],{type:"application/pdf"}),{contentType:"application/pdf",upsert:false});if(up.error)throw up.error;
      const garderR={...R,le:new Date().toISOString(),par:me};let ok=false;
      for(let n=0;n<6&&!ok;n++){const{data:row,error:e1}=await sb.from("chantiers").select("data,version").eq("id",id).single();if(e1)throw e1;
        const data=row.data||{},docs=(data.docs||[]).map(x=>({...x})),i=docs.findIndex(x=>x.id===d.id);if(i<0)throw new Error("fiche introuvable");
        docs[i]={...docs[i],id:path,name:docs[i].name&&/\.pdf$/i.test(docs[i].name)?docs[i].name:"Réception de chantier.pdf",size:bytes.length,at:today(),by:me,traite:false,rempli:{reste:0,total:1,le:today()},recep:garderR};
        const steps={...(data.steps||{})};if(!(steps.recep&&steps.recep.d))steps.recep={d:today(),by:me};
        const{data:upd,error:e2}=await sb.from("chantiers").update({data:{...data,docs,steps}}).eq("id",id).eq("version",row.version).select("id");if(e2)throw e2;
        ok=!!(upd&&upd.length);if(ok){chantiers.set(id,{...data,docs,steps});d.id=path}}
      if(!ok)throw new Error("conflit");
      try{localStorage.removeItem(cleBrouillon(id,{id:d.id}))}catch(_){}try{localStorage.removeItem(cleBrouillon(id,{id:path}))}catch(_){}
      toast("Réception enregistrée ✓ : le PDF signé est rangé dans la fiche du chantier.");history.back();setTimeout(()=>{if(typeof renderSheet==="function")renderSheet()},300)}
    catch(e){console.error(e);b.disabled=false;b.textContent="Terminer et signer ✓";toast(/row-level|violates|autoris/i.test(String(e&&e.message))?"Enregistrement refusé : la base doit autoriser les poseurs (outil/poseurs-fiches.sql). La réception reste gardée sur ce téléphone.":"Enregistrement impossible (réseau ?). La réception reste gardée sur ce téléphone : réessayez.")}}
  dessine()}

// ---------- PDF de la réception (A4, imprimable, signé) ----------
async function recepPdf(R,j,id){const{PDFDocument,StandardFonts,rgb}=PDFLib,doc=await PDFDocument.create(),F=await doc.embedFont(StandardFonts.Helvetica),B=await doc.embedFont(StandardFonts.HelveticaBold);
  const W=595,H=842,M=40,bleu=rgb(.063,.25,.494),gris=rgb(.34,.38,.44),orange=rgb(.79,.42,.17),vert=rgb(.18,.49,.29);let pg=doc.addPage([W,H]),y=H-M;
  const neuf=()=>{pg=doc.addPage([W,H]);y=H-M};const place=h=>{if(y-h<M)neuf()};
  const lignes=(t,f,s,w)=>{const mots=pdfTxt(t).split(/\s+/),L=[];let c="";for(const m of mots){const e=c?c+" "+m:m;if(f.widthOfTextAtSize(e,s)>w&&c){L.push(c);c=m}else c=e}if(c)L.push(c);return L};
  const txt=(t,{f=F,s=10,c=rgb(.11,.15,.2),x=M,w=W-2*M,g=3}={})=>{for(const l of lignes(t,f,s,w)){place(s+g);pg.drawText(l,{x,y:y-s,size:s,font:f,color:c});y-=s+g}};
  const titre=t=>{y-=6;place(24);pg.drawText(pdfTxt(t).toUpperCase(),{x:M,y:y-11,size:11,font:B,color:bleu});y-=17;pg.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:.6,color:bleu});y-=6};
  pg.drawText("Réception de chantier",{x:M,y:y-20,size:20,font:B,color:bleu});pg.drawText(pdfTxt("MGDS Menuiserie · "+new Date().toLocaleDateString("fr-FR")),{x:W-M-170,y:y-14,size:10,font:F,color:gris});y-=34;
  txt((j.clientNom||j.client||id)+" · "+(j.client||"").replace(/^.*?(D\d{9}[a-z]?).*$/i,"devis $1"),{f:B,s:11});txt(addrOf(j)||"",{c:gris});txt("Chef d'équipe : "+(R.chef||"")+" · fin de chantier le "+new Date().toLocaleDateString("fr-FR"),{c:gris});
  titre("Pour tout le chantier");COMMUNS.forEach((p,k)=>{const v=R.pt[k];txt((v==="ok"?"OK":v==="nc"?"À REPRENDRE":v==="so"?"Sans objet":"Non contrôlé")+" — "+p+(v==="nc"&&R.ptNote[k]?" : "+R.ptNote[k]:""),{c:v==="nc"?orange:v==="ok"?vert:gris})});
  titre("Contrôle produit par produit");R.prod.forEach(p=>{const L=REC[p.f]||REC.fen,n=L.filter(x=>p.c[x]).length,manq=L.filter(x=>!p.c[x]);
    txt((p.r||"")+" · "+(p.d||"")+" ("+(FAM_N[p.f]||"")+") : "+n+"/"+L.length+" points OK"+(p.q?" · "+REC_Q[p.f]+" : "+p.q:""),{f:B,s:10,c:n===L.length?vert:rgb(.11,.15,.2)});
    if(manq.length)txt("Non validé : "+manq.join(", "),{s:9,c:orange,x:M+10,w:W-2*M-10})});
  titre("Réserves du client");if(!R.res.length)txt(R.avec===false?"Réception sans réserve.":"Aucune réserve.",{c:vert});
  R.res.forEach((r,k)=>txt((k+1)+". "+(r.p!=null&&R.prod[r.p]?R.prod[r.p].r+" : ":"")+r.t+((r.ph||[]).length?" (photo)":""),{c:orange}));
  titre("Signatures");place(130);txt("Réception "+(R.avec?"avec réserves":"sans réserve")+", acceptée par le client.",{f:B});
  const bw=(W-2*M-20)/2,yS=y;for(const[k,lab,x]of[["sigC","Client : "+(R.nom||""),M],["sigE","Chef d'équipe : "+(R.chef||""),M+bw+20]]){pg.drawRectangle({x,y:yS-100,width:bw,height:96,borderColor:rgb(.8,.83,.87),borderWidth:1});pg.drawText(pdfTxt(lab),{x:x+6,y:yS-14,size:9,font:F,color:gris});
    if(R[k]){try{const im=await doc.embedPng(R[k]),sc=Math.min((bw-12)/im.width,72/im.height);pg.drawImage(im,{x:x+6,y:yS-96,width:im.width*sc,height:im.height*sc})}catch(_){}}}y=yS-110;
  // photos des réserves et des produits (vignettes)
  const P=[...R.res.flatMap(r=>(r.ph||[]).map(ch=>({ch,l:"Réserve : "+r.t}))),...R.prod.flatMap(p=>p.ph.map(ch=>({ch,l:p.r+" · "+p.d})))].slice(0,12);
  if(P.length){neuf();titre("Photos");let col=0;const tw=(W-2*M-20)/2;
    for(const o of P){try{const r=await sb.storage.from("photos").download(o.ch);if(r.error)continue;const im=await doc.embedJpg(new Uint8Array(await r.data.arrayBuffer())),sc=Math.min(tw/im.width,200/im.height),hh=im.height*sc;
      if(col===0)place(hh+24);const x=M+col*(tw+20);pg.drawImage(im,{x,y:y-hh,width:im.width*sc,height:hh});pg.drawText(pdfTxt(o.l).slice(0,60),{x,y:y-hh-11,size:8,font:F,color:gris});
      if(col===1){y-=hh+22;col=0}else col=1}catch(_){}}}
  const n=doc.getPageCount();doc.getPages().forEach((p,k)=>p.drawText(pdfTxt("Réception · "+(j.client||id)+" · page "+(k+1)+"/"+n),{x:M,y:20,size:8,font:F,color:gris}));
  return await doc.save()}

window.ficheTel=(d,j)=>d.type==="Préparation"?prepTel(d,j):d.type==="Réception"?recepTel(d,j):null;
const st=document.createElement("style");st.textContent=`.modal.ftel{align-items:stretch;background:var(--bg)}.modal.ftel>div{width:100%;max-width:720px;max-height:none;height:100%;border-radius:0;padding:0;display:flex;flex-direction:column}
.ftbar{position:sticky;top:0;z-index:2;display:flex;gap:8px;align-items:center;padding:10px 12px;padding-top:max(10px,env(safe-area-inset-top));background:var(--bg);border-bottom:1px solid var(--line)}.ftbar b{flex:1;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ftcorps{flex:1;overflow:auto;padding:12px;display:grid;gap:12px;align-content:start;-webkit-overflow-scrolling:touch}
.ftc{background:var(--surface,#fff);border:1px solid var(--line);border-radius:14px;padding:14px;display:grid;gap:8px}.ftc h2{margin:0;font-size:22px}.ftc h3{margin:0;font-size:17px}.ftc p{margin:0}
.ftc.ok{border-color:#2f7d4a;background:#e8f5ec}.ftc.ko{border-color:#c96a2c;background:#fdf0e6}
.ftacts{display:flex;gap:8px;flex-wrap:wrap}.ftchk{display:flex;flex-wrap:wrap;gap:6px}.ftchk span{background:#e8eff8;border-radius:8px;padding:3px 8px;font-size:14px}
.ftnote{border-left:4px solid #c96a2c;background:#fbe3d3;color:#1d2633;padding:6px 10px;border-radius:0 8px 8px 0;font-weight:600}
.ftmt{padding:8px}.ftmt .mtlire .pg2{grid-template-columns:1fr}.ftmt .mtlire header{display:none}
.ftprog{position:sticky;top:0;background:var(--bg);padding-bottom:6px;display:grid;gap:6px;z-index:1}.ftst{font-size:14px}.ftbarres{display:flex;gap:4px}.ftbarres i{flex:1;height:5px;border-radius:3px;background:var(--line)}.ftbarres i.on{background:#10407e}
#ftrc{display:grid;gap:12px}.ftpied{position:sticky;bottom:0;display:flex;gap:10px;padding:10px 0 max(10px,env(safe-area-inset-bottom));background:var(--bg)}.ftpied .btn{flex:1;padding:14px;font-size:17px}
.fttri{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:6px}.fttri button,.ftchips button{font:600 15px inherit;padding:11px 8px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface,#fff);color:inherit;cursor:pointer;text-align:left}
.fttri button{text-align:center}.fttri button[aria-pressed="true"]{background:#10407e;border-color:#10407e;color:#fff}.fttri button[data-v="nc"][aria-pressed="true"]{background:#c96a2c;border-color:#c96a2c}
.ftchips{display:grid;gap:6px}.ftchips button[aria-pressed="true"]{background:#2f7d4a;border-color:#2f7d4a;color:#fff}.ftfam{font:600 11px inherit;letter-spacing:.04em;text-transform:uppercase;color:#10407e;background:#e8eff8;border-radius:6px;padding:2px 8px;justify-self:start}
.ftl{display:grid;gap:4px;font-weight:600}.ftl input,.ftl select,.ftc textarea,.ftc input[type=text]{font:16px inherit;padding:10px;border:1px solid var(--line);border-radius:10px;width:100%;box-sizing:border-box;background:var(--surface,#fff);color:inherit}.ftc textarea{min-height:70px}
.ftph{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.ftph img{width:64px;height:64px;object-fit:cover;border-radius:8px;background:var(--line)}
.ftmic{font-size:18px;padding:14px}.ftmic.rec{background:#b83a3a;border-color:#b83a3a}.ftlive{color:var(--muted);font-style:italic;min-height:1em}
.ftsig{width:100%;height:180px;border:1.5px dashed #9aa3b0;border-radius:12px;background:#fff;touch-action:none}`;
document.head.appendChild(st);
})();
