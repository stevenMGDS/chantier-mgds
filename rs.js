// ---------- Réception de support (chantier neuf) au format HTML (Steven, 25/11/2026) ----------
// Fiche faite AVANT la pose, par Yannick ou Steven (le métré des chantiers neufs) — à ne pas confondre avec la réception de
// chantier, après la pose. Même principe que le métré tablette : les données sont rangées dans la fiche Support du chantier
// (docs[].rs), reprises de la fiche PDF pré-remplie d'après le devis (repère, libellé, cote devis, infos), et la fiche se
// remplit en 4 parties : chantier, support et pose, une carte par menuiserie, synthèse et signature. « Imprimer / PDF » sort
// la fiche à jour ; le lien « PDF » de la fiche ouvre toujours le PDF d'origine.
(()=>{
const $r=id=>document.getElementById(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ro=()=>!(canWrite||canFill);
let S=null;const urls=new Map();
const FA={g:"Montant gauche",d:"Montant droit",h:"Traverse haute",b:"Appui / traverse basse"};
const CODES={g:["A1","A2","A3","A4"],d:["A1","A2","A3","A4"],h:["N1","N2","N3","N4"],b:["N1","N2","N3","N4"]};
const LEG={A0:"D'aplomb",A1:"Haut vers la baie",A2:"Haut vers le mur",A3:"Haut vers l'intérieur",A4:"Haut vers l'extérieur",
  N0:"De niveau",N1:"Côté gauche plus bas",N2:"Côté droit plus bas",N3:"Pente vers l'extérieur",N4:"Pente vers l'intérieur"};
const TOL=10; // écart toléré entre cote brute et cote du devis (mm)

// ---------- reprise de la fiche PDF pré-remplie ----------
async function depuisPdf(j,d){const rs={ch:{},sp:{},men:[],syn:{},sig:{},cree:today()};
  try{if(!window.PDFLib||!d||!/\.pdf$/i.test(d.name||""))throw 0;const r=await fetch("/_blob/"+d.id);if(!r.ok)throw 0;
    const pdf=await PDFLib.PDFDocument.load(await r.arrayBuffer(),{ignoreEncryption:true}),F={};
    pdf.getForm().getFields().forEach(f=>{let v="";try{if(f.getText)v=(f.getText()||"").trim();else if(f.isChecked)v=f.isChecked()?"1":""}catch(_){}F[f.getName()]=v});
    const g=k=>F[k]||F[k+"_1"]||"";
    rs.ch={client:g("client_nom"),adresse:g("adresse_chantier"),devis:g("devis"),commercial:g("commercial"),ctrl:g("controleur"),date:F.date_visite||"",lot:F.rem_lot||"",macon:F.macon||"",moe:F.rem_moe||""};
    for(let n=1;n<=40;n++){const rep=F["repere_"+n],des=F["designation_"+n];if(rep===undefined&&des===undefined)continue;if(!(rep||des||F["dimdevis_"+n]))continue;
      rs.men.push(nouv(rep,des,F["dimdevis_"+n]||"",F["rem_info_"+n]||""))}}catch(_){}
  // fiche PDF sans menuiseries de réception de support (ex. ancien métré passé en Support quand le chantier est devenu neuf) :
  // les lignes sont reprises comme le métré tablette (repère, libellé, cote)
  if(!rs.men.length&&window.mtLignes){try{const{prod}=await mtLignes(j,d);prod.forEach(p=>rs.men.push(nouv(p.r,p.d,p.cote,"")))}catch(_){}}
  if(!rs.ch.client){rs.ch.client=j.clientNom||j.client||"";rs.ch.adresse=[j.adresse,j.ville].filter(Boolean).join(", ");rs.ch.commercial=j.commercial||""}
  if(!rs.ch.devis){const m=/D\d{9}\w?/.exec(j.client||"");rs.ch.devis=m?m[0]:""}
  return rs}
const nouv=(r,d,cote,info)=>({k:Math.random().toString(36).slice(2,9),r:r||"",d:d||"",cote:cote||"",info:info||"",v:{},fa:{},fac:{},ph:[]});

// ---------- enregistrement ----------
function docOf(){const j=jobs.get(S.jid);return j&&(j.docs||[]).find(d=>d.id===S.did)}
function etat(t){const e=$r("rsetat");if(e)e.textContent=t}
function sched(){if(ro())return;S.dirty=true;etat("Modifications non enregistrées…");clearTimeout(S.t);S.t=setTimeout(save,1200)}
const reste=rs=>{let r=0;rs.men.forEach(m=>{if(!m.v.bl||!m.v.bh)r++;if(!m.v.vr)r++;if(!m.v.rej)r++});if(!rs.sp.marque)r++;if(!rs.sp.mat)r++;if(!rs.sp.pose)r++;if(!rs.syn.conf)r++;if(!(rs.sig.ctrl&&rs.sig.ctrl.img))r++;return r};
// 26/11/2026 : comme le métré, une saisie faite pendant un enregistrement est renvoyée juste après, l'heure (maj) protège la
// fiche d'une écriture partie d'une copie ancienne, bouton « Enregistrer » et enregistrement en quittant l'écran
async function save(){if(!S||!S.dirty)return;if(S.saving){S.again=true;return}S.saving=true;S.dirty=false;S.again=false;clearTimeout(S.t);const S0=S;
  const j=jobs.get(S.jid),total=S.rs.men.length*3+5,rst=reste(S.rs),maj=Date.now();
  const docs=(j.docs||[]).map(d=>d.id===S.did?{...d,rs:JSON.parse(JSON.stringify(S.rs)),maj,rempli:{le:today(),reste:rst,total},traite:true}:d);
  etat("Enregistrement…");let ko=false;
  try{await db.doc("chantiers/"+S0.jid).update({docs});j.docs=docs;if(S===S0&&!S.dirty)etat("✓ Enregistré à "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}))}
  catch(_){ko=true;S0.dirty=true;if(S===S0){etat("⚠️ Pas enregistré (réseau ?) : nouvel essai dans 10 s");clearTimeout(S.t);S.t=setTimeout(save,10000)}}
  finally{S0.saving=false;if(S===S0&&S.dirty&&(S.again||!ko)){clearTimeout(S.t);S.t=setTimeout(save,300)}}}
addEventListener("pagehide",()=>{if(S&&S.dirty)save()});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&S&&S.dirty)save()});

// ---------- ouverture ----------
window.rsOpen=async(jid,did)=>{const j=jobs.get(jid),d=j&&(j.docs||[]).find(x=>x.id===did);if(!d)return;
  let rs=d.rs?JSON.parse(JSON.stringify(d.rs)):null,neuf=false;if(!rs){rs=await depuisPdf(j,d);neuf=true}
  rs.men.forEach(m=>{m.v=m.v||{};m.fa=m.fa||{};m.fac=m.fac||{};m.ph=m.ph||[]});rs.sp=rs.sp||{};rs.syn=rs.syn||{};rs.sig=rs.sig||{};
  if(!rs.ch.date&&!ro())rs.ch.date=today();if(!rs.ch.ctrl&&!ro()&&window.mgdsProfil)rs.ch.ctrl=mgdsProfil.nom||"";
  S={jid,did,rs,cur:"ch",dirty:false};$r("rstitre").textContent="Réception de support · "+(j.client||"");$r("rssous").textContent=rs.ch.adresse||"";
  $r("rsov").hidden=false;$r("rsov").classList.toggle("ro",ro());document.body.style.overflow="hidden";draw();
  if(neuf&&!ro()){S.dirty=true;save();toast(rs.men.length?rs.men.length+" menuiserie"+(rs.men.length>1?"s reprises":" reprise")+" de la fiche PDF":"Fiche créée : ajoutez les menuiseries")}};
window.rsClose=async()=>{if(!S)return;if(S.dirty||S.saving){for(let n=0;n<40&&S.saving;n++)await new Promise(r=>setTimeout(r,150));if(S.dirty)await save()}S=null;$r("rsov").hidden=true;document.body.style.overflow="";if(typeof renderSheet==="function")renderSheet()};

// ---------- champs ----------
function seg(lab,opts,get,set,oblig){const w=document.createElement("div");w.className="ch"+(oblig&&!get()?" vide":"");w.innerHTML=`<span>${E(lab)}</span>`;const d=document.createElement("div");d.className="seg";
  opts.forEach(o=>{const b=document.createElement("button");b.type="button";b.textContent=o;b.setAttribute("aria-pressed",get()===o);b.disabled=ro();b.onclick=()=>{set(get()===o?"":o);sched();draw()};d.appendChild(b)});w.appendChild(d);return w}
function txt(lab,get,set,o={}){const w=document.createElement("label");w.className="ch"+(o.large?" large":"")+(o.oblig&&!get()?" vide":"");w.innerHTML=`<span>${E(lab)}</span>`;
  const i=document.createElement(o.area?"textarea":"input");if(!o.area)i.type=o.type||"text";if(o.mm){i.inputMode="numeric";i.placeholder="mm"}i.value=get()||"";i.disabled=ro();
  i.oninput=()=>{set(o.mm?i.value.replace(/[^\d]/g,""):i.value);sched();if(o.live)o.live()};w.appendChild(i);return w}
const grp=(titre,html)=>{const g=document.createElement("section");g.className="grp";g.innerHTML=`<h3>${E(titre)}</h3>`;if(html)g.insertAdjacentHTML("beforeend",html);return g};
const champs=()=>{const d=document.createElement("div");d.className="champs";return d};
const nb=t=>(String(t||"").match(/\d{3,5}/g)||[]).map(Number);
function ecart(m){const[dl,dh]=nb(m.cote),o=[];if(dl&&+m.v.bl&&Math.abs(+m.v.bl-dl)>TOL)o.push(`largeur brute ${m.v.bl} pour ${dl} au devis`);if(dh&&+m.v.bh&&Math.abs(+m.v.bh-dh)>TOL)o.push(`hauteur brute ${m.v.bh} pour ${dh} au devis`);return o}
const defauts=m=>Object.keys(FA).filter(k=>+m.fa[k]>0||m.fac[k]).length+(m.v.vr==="Non conforme"?1:0)+(m.v.rej==="Non conforme"?1:0)+(m.v.obs?1:0);

// ---------- affichage ----------
function liste(){const L=$r("rsliste"),rs=S.rs,ok=m=>m.v.bl&&m.v.bh&&m.v.vr&&m.v.rej;
  const it=(k,t,s,cl="")=>`<button type="button" class="it ${cl}" data-k="${k}" aria-current="${S.cur===k}"><b>${t}</b><small>${s}</small></button>`;
  L.innerHTML=it("ch","Chantier",E([rs.ch.ctrl,rs.ch.date?fr(rs.ch.date):""].filter(Boolean).join(" · ")||"contrôleur, date, intervenants"))
   +it("sp","Support et pose",E([rs.sp.marque,rs.sp.mat,rs.sp.pose].filter(Boolean).join(" · ")||"marque, support, pose, fixations"),!(rs.sp.marque&&rs.sp.mat&&rs.sp.pose)?"afaire":"")
   +rs.men.map((m,i)=>{const n=defauts(m),e=ecart(m).length;return it(String(i),E(m.r||"Menuiserie "+(i+1)),E(m.cote||m.d||"")+(e?" · ⚠ écart de cote":"")+(n?` · ${n} réserve${n>1?"s":""}`:ok(m)?" · ✓":""),ok(m)?(n||e?"res":"okk"):"afaire")}).join("")
   +(ro()?"":`<button type="button" class="ajout" data-k="add">＋ Ajouter une menuiserie</button>`)
   +it("syn","Synthèse et signature",rs.syn.conf?E(rs.syn.conf)+(rs.sig.ctrl&&rs.sig.ctrl.img?" · signée":" · à signer"):"à faire",rs.syn.conf&&rs.sig.ctrl&&rs.sig.ctrl.img?"okk":"afaire");
  L.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{if(b.dataset.k==="add"){S.rs.men.push(nouv("","","",""));S.cur=String(S.rs.men.length-1);sched()}else S.cur=b.dataset.k;draw();$r("rsfiche").scrollTop=0});
  const r=reste(rs);$r("rsglob").textContent=r?r+" point"+(r>1?"s":"")+" à remplir":"Fiche complète ✓"}
function draw(){liste();const f=$r("rsfiche");f.innerHTML="";const rs=S.rs;
  if(S.cur==="ch"){const g=grp("Chantier"),c=champs();
    [["Client","client"],["Adresse du chantier","adresse",1],["N° de devis","devis"],["Commercial","commercial"],["Contrôlé par","ctrl"],["Lot","lot"],["Entreprise gros œuvre (maçon)","macon"],["Maître d'œuvre / architecte","moe"]].forEach(([l,k,lg])=>c.appendChild(txt(l,()=>rs.ch[k],v=>{rs.ch[k]=v;if(k==="ctrl")liste()},{large:lg})));
    c.appendChild(txt("Date de visite",()=>rs.ch.date,v=>{rs.ch.date=v;liste()},{type:"date"}));g.appendChild(c);f.appendChild(g);return}
  if(S.cur==="sp"){const g=grp("Support et pose","<p class=\"sub\">Pour toutes les menuiseries de cette fiche. Gauche / droite : toujours vus depuis l'INTÉRIEUR du logement.</p>"),c=champs();
    c.appendChild(seg("Marque des menuiseries",["K-line","Technal","Autre"],()=>rs.sp.marque,v=>rs.sp.marque=v,1));
    if(rs.sp.marque==="Autre")c.appendChild(txt("Marque (autre)",()=>rs.sp.marqueA,v=>rs.sp.marqueA=v));
    c.appendChild(seg("Matériau du support",["Parpaing creux","Béton","Brique creuse","Brique pleine","Bois","Acier"],()=>rs.sp.mat,v=>rs.sp.mat=v,1));
    c.appendChild(seg("Pose",["Applique intérieure","Applique extérieure","Tunnel au nu intérieur","Tunnel au nu extérieur"],()=>rs.sp.pose,v=>rs.sp.pose=v,1));
    c.appendChild(seg("Fixations",["Fournies avec les menuiseries","À prévoir par MGDS"],()=>rs.sp.fix,v=>rs.sp.fix=v));
    c.appendChild(txt("Type de fixation",()=>rs.sp.fixType,v=>rs.sp.fixType=v));g.appendChild(c);
    g.insertAdjacentHTML("beforeend",`<p class="sub"><b>Commande</b> = cotes TABLEAU en applique · cotes HORS TOUT en tunnel.</p>`);f.appendChild(g);f.appendChild(legende());return}
  if(S.cur==="syn"){const g=grp("Synthèse de la réception"),c=champs(),n=rs.men.reduce((s,m)=>s+defauts(m),0),e=rs.men.reduce((s,m)=>s+ecart(m).length,0);
    g.insertAdjacentHTML("beforeend",`<p class="sub">${rs.men.length} menuiserie${rs.men.length>1?"s":""} · ${n} réserve${n>1?"s":""} relevée${n>1?"s":""}${e?` · <b class="rouge">${e} écart${e>1?"s":""} de cote avec le devis</b>`:""}</p>`);
    c.appendChild(seg("Support",["Conforme","Conforme avec réserves","Non conforme : pose impossible en l'état"],()=>rs.syn.conf,v=>rs.syn.conf=v,1));
    c.appendChild(txt("Étanchéité de base (remarques)",()=>rs.syn.etanch,v=>rs.syn.etanch=v,{large:1,area:1}));
    c.appendChild(txt("Remarques générales / à transmettre au maçon",()=>rs.syn.rem,v=>rs.syn.rem=v,{large:1,area:1}));g.appendChild(c);f.appendChild(g);
    const s=grp("Signatures");s.appendChild(sigBloc("ctrl","Contrôlé par "+(rs.ch.ctrl||"")));s.appendChild(sigBloc("macon","Entreprise gros œuvre (si présente)"));f.appendChild(s);return}
  const i=+S.cur,m=rs.men[i];if(!m){S.cur="ch";draw();return}
  const t=document.createElement("div");t.className="ftete";t.innerHTML=`<h2>Menuiserie n° ${i+1}</h2>`;f.appendChild(t);
  const g0=grp("Ce que dit le devis"),c0=champs();c0.appendChild(txt("Pièce / repère",()=>m.r,v=>{m.r=v;liste()}));c0.appendChild(txt("Libellé devis",()=>m.d,v=>m.d=v,{large:1}));
  c0.appendChild(txt("Cote devis L × H",()=>m.cote,v=>m.cote=v));c0.appendChild(txt("Infos devis",()=>m.info,v=>m.info=v,{large:1}));g0.appendChild(c0);f.appendChild(g0);
  const g1=grp("Dimensions (mm)"),c1=champs(),al=document.createElement("div");al.className="alerte";const majAl=()=>{const o=ecart(m);al.hidden=!o.length;al.innerHTML=o.length?"<b>Écart avec le devis :</b> "+E(o.join(" · ")):"";liste()};
  [["Brute L (contrôle)","bl"],["Brute H (contrôle)","bh"],["Commande L","cl"],["Commande H","chh"],["Allège","all"]].forEach(([l,k])=>c1.appendChild(txt(l,()=>m.v[k],v=>m.v[k]=v,{mm:1,oblig:k==="bl"||k==="bh",live:majAl})));
  g1.appendChild(c1);g1.appendChild(al);majAl();f.appendChild(g1);
  const g2=grp("Réservations"),c2=champs();c2.appendChild(seg("Réservation volet roulant",["Sans VR","Conforme","Non conforme"],()=>m.v.vr,v=>m.v.vr=v,1));
  c2.appendChild(seg("Rejingot",["Aligné nu intérieur","Débord intérieur","Non conforme"],()=>m.v.rej,v=>m.v.rej=v,1));
  c2.appendChild(txt("Cote de rejingot relevée",()=>m.v.rejc,v=>m.v.rejc=v,{mm:1}));c2.appendChild(txt("Remarque rejingot",()=>m.v.rejr,v=>m.v.rejr=v,{large:1}));g2.appendChild(c2);f.appendChild(g2);
  const g3=grp("Faux aplomb / faux niveau",`<p class="sub">Ne noter que les défauts : vide = OK. Code du croquis (voir « Support et pose ») et écart en mm.</p>`),c3=champs();
  Object.entries(FA).forEach(([k,l])=>{const w=document.createElement("div");w.className="ch fa"+(+m.fa[k]>0||m.fac[k]?" def":"");w.innerHTML=`<span>${E(l)}</span>`;const d=document.createElement("div");d.className="seg";
    CODES[k].forEach(c=>{const b=document.createElement("button");b.type="button";b.textContent=c;b.title=LEG[c];b.disabled=ro();b.setAttribute("aria-pressed",(m.fac[k]||"").split("+").includes(c));
      b.onclick=()=>{const a=new Set((m.fac[k]||"").split("+").filter(Boolean));a.has(c)?a.delete(c):a.add(c);m.fac[k]=[...a].sort().join("+");sched();draw()};d.appendChild(b)});
    const i2=document.createElement("input");i2.inputMode="numeric";i2.placeholder="mm";i2.className="mm";i2.value=m.fa[k]||"";i2.disabled=ro();i2.oninput=()=>{m.fa[k]=i2.value.replace(/[^\d]/g,"");sched();liste()};d.appendChild(i2);w.appendChild(d);c3.appendChild(w)});
  g3.appendChild(c3);f.appendChild(g3);
  const g4=grp("Observations et photos"),c4=champs();c4.appendChild(txt("Observations / réserves (vide = support conforme)",()=>m.v.obs,v=>{m.v.obs=v;liste()},{large:1,area:1}));g4.appendChild(c4);g4.appendChild(photos(m));f.appendChild(g4);
  if(!ro()){const z=document.createElement("div");z.className="acts";z.innerHTML=`<button type="button" class="b2 rouge">Retirer cette menuiserie</button>`;
    z.firstChild.onclick=()=>{if(!confirm("Retirer « "+(m.r||"menuiserie "+(i+1))+" » de la fiche ?"))return;rs.men.splice(i,1);S.cur=rs.men.length?String(Math.min(i,rs.men.length-1)):"syn";sched();draw()};f.appendChild(z)}}
function legende(){const g=grp("Références des croquis");const s=(c,lab)=>`<div class="leg"><b>${c}</b><span>${E(lab)}</span></div>`;
  g.insertAdjacentHTML("beforeend",`<p class="sub">Montants (gauche / droite) : faux aplomb FA · Traverses (haut / bas) : faux niveau FN · défaut combiné : ex. A1+A3.</p><div class="legs">${Object.entries(LEG).map(([c,l])=>s(c,l)).join("")}</div>`);return g}
function photos(m){const w=document.createElement("div");w.className="photo";
  if(!ro()){const l=document.createElement("label");l.textContent="📷 Photo";const i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=true;i.hidden=true;
    const envoi=async fs=>{for(const fl of fs){try{const b=await shrink(fl,3000,.88);const r=await assets.upload(new File([b],"support-"+(m.r||"photo")+".jpg",{type:"image/jpeg"}));m.ph.push(r.id);sched();draw()}catch(_){toast("Photo non envoyée (réseau ?)")}}};
    i.onchange=()=>{const fs=[...i.files];i.value="";envoi(fs)};l.appendChild(i);
    l.addEventListener("click",e=>{if(e.target===i||!window.appCam)return;e.preventDefault();appCam(envoi,{titre:"Photos · "+(m.r||"menuiserie"),repli:()=>i.click()})});w.appendChild(l)}
  m.ph.forEach(id=>{const a=document.createElement("a");a.href="#";a.className="th";const im=new Image();im.alt="Photo";a.appendChild(im);
    const show=u=>{im.src=u;a.onclick=e=>{e.preventDefault();window.open(u,"_blank")}};if(urls.has(id))show(urls.get(id));else if(window.sbClient)sbClient.storage.from("documents").createSignedUrl(id,3600).then(({data})=>{if(data){urls.set(id,data.signedUrl);show(data.signedUrl)}});w.appendChild(a)});
  return w}
function sigBloc(k,lab){const s=S.rs.sig,w=document.createElement("div");w.className="sig";const v=s[k];
  w.innerHTML=`<span>${E(lab)}</span>${v&&v.img?`<img src="${v.img}" alt="Signature"><small>signé le ${E(fr(v.le))}</small>${ro()?"":`<button type="button" class="b2">Effacer</button>`}`:ro()?`<small>non signé</small>`:`<canvas width="520" height="170"></canvas><div class="acts"><button type="button" class="b2" data-ok>Valider la signature</button><button type="button" class="b2" data-raz>Recommencer</button></div>`}`;
  const cv=w.querySelector("canvas");
  if(cv){const x=cv.getContext("2d");x.lineWidth=2.4;x.lineCap="round";x.strokeStyle="#10407e";let on=false,trace=false;const pt=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]};
    cv.onpointerdown=e=>{on=true;cv.setPointerCapture(e.pointerId);x.beginPath();x.moveTo(...pt(e))};cv.onpointermove=e=>{if(!on)return;x.lineTo(...pt(e));x.stroke();trace=true};cv.onpointerup=()=>{on=false};
    w.querySelector("[data-raz]").onclick=()=>{x.clearRect(0,0,cv.width,cv.height);trace=false};
    w.querySelector("[data-ok]").onclick=()=>{if(!trace){toast("Signez dans le cadre.");return}s[k]={img:cv.toDataURL("image/png"),le:today()};sched();draw()}}
  else if(v&&v.img&&!ro())w.querySelector("button").onclick=()=>{if(confirm("Effacer cette signature ?")){delete s[k];sched();draw()}};
  return w}

// ---------- impression / PDF ----------
function ficheDoc(rs,j){const L=(l,v)=>v?`<tr><th>${E(l)}</th><td>${E(v)}</td></tr>`:"";
  const men=rs.men.map((m,i)=>{const fa=Object.entries(FA).map(([k,l])=>+m.fa[k]>0||m.fac[k]?`${l} : ${m.fac[k]||""} ${m.fa[k]?m.fa[k]+" mm":""}`:"").filter(Boolean).join(" · ");
    const ec=ecart(m);return`<section class="pp"><h2>Menuiserie n° ${i+1} · ${E(m.r)} <small>${E(m.d)}</small></h2><table>${L("Cote devis",m.cote)}${L("Infos devis",m.info)}
      ${L("Brutes (contrôle)",m.v.bl||m.v.bh?(m.v.bl||"?")+" × "+(m.v.bh||"?")+" mm":"")}${L("Commande",m.v.cl||m.v.chh?(m.v.cl||"?")+" × "+(m.v.chh||"?")+" mm":"")}${L("Allège",m.v.all?m.v.all+" mm":"")}
      ${L("Réservation VR",m.v.vr)}${L("Rejingot",[m.v.rej,m.v.rejc?m.v.rejc+" mm":"",m.v.rejr].filter(Boolean).join(" · "))}${L("FA / FN",fa||"OK")}${L("Écart avec le devis",ec.join(" · "))}${L("Observations",m.v.obs||"Support conforme")}${m.ph.length?L("Photos",m.ph.length+" dans la fiche de l'appli"):""}</table></section>`}).join("");
  const sg=(k,l)=>{const v=rs.sig[k];return v&&v.img?`<div class="sg"><b>${E(l)}</b><img src="${v.img}" alt=""><small>le ${E(fr(v.le))}</small></div>`:""};
  return`<header><b>Réception de support – chantier neuf</b><span>MGDS · ${E(rs.ch.devis||"")} · ${E(new Date().toLocaleDateString("fr-FR"))}</span></header>
   <section class="pp"><h2>Chantier</h2><table>${L("Client",rs.ch.client)}${L("Adresse",rs.ch.adresse)}${L("N° devis",rs.ch.devis)}${L("Commercial",rs.ch.commercial)}${L("Contrôlé par",rs.ch.ctrl)}${L("Date de visite",rs.ch.date?fr(rs.ch.date):"")}${L("Lot",rs.ch.lot)}${L("Gros œuvre",rs.ch.macon)}${L("Maître d'œuvre",rs.ch.moe)}</table></section>
   <section class="pp"><h2>Support et pose</h2><table>${L("Marque",rs.sp.marque==="Autre"?rs.sp.marqueA||"Autre":rs.sp.marque)}${L("Support",rs.sp.mat)}${L("Pose",rs.sp.pose)}${L("Fixations",[rs.sp.fix,rs.sp.fixType].filter(Boolean).join(" · "))}</table>
   <p class="lg">${Object.entries(LEG).map(([c,l])=>`<b>${c}</b> ${E(l)}`).join(" · ")}</p></section>${men}
   <section class="pp"><h2>Synthèse</h2><table>${L("Support",rs.syn.conf)}${L("Étanchéité",rs.syn.etanch)}${L("Remarques",rs.syn.rem)}</table><div class="sgs">${sg("ctrl","Contrôlé par "+(rs.ch.ctrl||""))}${sg("macon","Gros œuvre")}</div></section>`}
function imprimer(){const j=jobs.get(S.jid)||{};$r("rsprint").innerHTML=ficheDoc(S.rs,j);
  document.body.classList.add("rsprinting");const fin=()=>{document.body.classList.remove("rsprinting");removeEventListener("afterprint",fin)};addEventListener("afterprint",fin);setTimeout(()=>window.print(),50)}
window.rsDoc=(rs,j)=>ficheDoc(rs,j||{});

// ---------- interface ----------
const css=`#rsov[hidden]{display:none!important}#rsov{position:fixed;inset:0;z-index:60;background:var(--bg,#f5f5f7);color:var(--ink,#1d1d1f);display:grid;grid-template-rows:auto 1fr;font-size:16px}
#rsov .mbar{background:#10407e;color:#fff;padding:10px 16px;padding-top:max(10px,env(safe-area-inset-top));display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center}
#rsov .mbar b{font-size:19px}#rsov .mbar .s{font-size:13px;opacity:.85}#rsov .mbar .sp{margin-left:auto}
#rsov .mbar button{font:600 14px inherit;border:0;border-radius:10px;padding:9px 13px;background:#fff;color:#10407e;cursor:pointer}#rsov #rsetat{font-size:13px;opacity:.95}#rsov.ro #rssv{display:none}
#rsov .corps{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:0}
#rsov .liste{border-right:1px solid var(--line,#e3e3e8);padding:10px;display:grid;gap:8px;align-content:start;overflow:auto;background:var(--sunk,#ededf0)}
#rsov .liste .it{all:unset;box-sizing:border-box;cursor:pointer;display:grid;gap:2px;padding:9px 11px;border-radius:12px;border:1.5px solid var(--line,#e3e3e8);background:var(--surface,#fff)}
#rsov .liste .it[aria-current="true"]{border-color:#10407e;box-shadow:0 0 0 2px #10407e inset}#rsov .liste .it small{color:var(--muted,#6e6e73);font-size:12.5px}
#rsov .liste .it.okk{border-left:5px solid #2f7d4a}#rsov .liste .it.res{border-left:5px solid #c96a2c}#rsov .liste .it.afaire{border-left:5px solid var(--line,#c8c8cc)}
#rsov .ajout{font:600 14px inherit;border:1.5px dashed var(--muted,#6e6e73);border-radius:12px;padding:10px;background:none;color:var(--ink,#1d1d1f);cursor:pointer}
#rsov .fiche{padding:14px 18px 40px;display:grid;gap:14px;align-content:start;overflow:auto;-webkit-overflow-scrolling:touch}
#rsov .ftete h2{margin:0;font-size:20px}#rsov .grp{background:var(--surface,#fff);border:1px solid var(--line,#e3e3e8);border-radius:14px;padding:12px 14px;display:grid;gap:10px}
#rsov .grp h3{margin:0;font-size:15px;color:#10407e}#rsov .sub{margin:0;color:var(--muted,#6e6e73);font-size:13.5px}
#rsov .champs{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px 14px}
#rsov .ch{display:grid;gap:4px;font-size:13.5px;color:var(--muted,#6e6e73)}#rsov .ch.large{grid-column:1/-1}#rsov .ch.vide>span::after{content:" •";color:#c0392b}
#rsov .ch input,#rsov .ch textarea{font:16px inherit;padding:9px 10px;border-radius:10px;border:1px solid var(--line,#d2d2d7);background:var(--bg,#fff);color:var(--ink,#1d1d1f)}#rsov .ch textarea{min-height:70px}
#rsov .seg{display:flex;flex-wrap:wrap;gap:6px;align-items:center}#rsov .seg button{font:600 14px inherit;padding:9px 12px;border-radius:10px;border:1.5px solid var(--line,#d2d2d7);background:var(--surface,#fff);color:var(--ink,#1d1d1f);cursor:pointer}
#rsov .seg button[aria-pressed="true"]{background:#10407e;border-color:#10407e;color:#fff}#rsov .seg input.mm{width:80px;font:16px inherit;padding:8px;border-radius:10px;border:1px solid var(--line,#d2d2d7)}
#rsov .ch.fa.def>span{color:#c96a2c;font-weight:700}#rsov .alerte{background:#fdecea;color:#8a1c12;border-radius:10px;padding:8px 10px;font-size:14px}#rsov .rouge{color:#c0392b}
#rsov .legs{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px}#rsov .leg{display:flex;gap:8px;font-size:13.5px}#rsov .leg b{min-width:28px;color:#10407e}
#rsov .photo{display:flex;flex-wrap:wrap;gap:8px;align-items:center}#rsov .photo label{font:600 14px inherit;padding:9px 12px;border-radius:10px;background:#10407e;color:#fff;cursor:pointer}
#rsov .photo .th img{width:84px;height:84px;object-fit:cover;border-radius:8px}#rsov .acts{display:flex;gap:8px;flex-wrap:wrap}
#rsov .b2{font:600 14px inherit;padding:9px 12px;border-radius:10px;border:1.5px solid var(--line,#d2d2d7);background:var(--surface,#fff);color:var(--ink,#1d1d1f);cursor:pointer}#rsov .b2.rouge{color:#c0392b}
#rsov .sig{display:grid;gap:6px;font-size:14px}#rsov .sig canvas{width:100%;max-width:520px;height:auto;aspect-ratio:520/170;border:1.5px dashed var(--muted,#6e6e73);border-radius:10px;background:#fff;touch-action:none}#rsov .sig img{max-width:320px;background:#fff;border-radius:8px}
#rsov.ro .seg button{cursor:default}
@media (max-width:760px){#rsov .corps{grid-template-columns:1fr;grid-template-rows:auto 1fr}#rsov .liste{grid-auto-flow:column;grid-auto-columns:minmax(170px,1fr);overflow-x:auto;border-right:0;border-bottom:1px solid var(--line,#e3e3e8)}}
#rsprint{display:none}
@media print{body.rsprinting>*:not(#rsprint){display:none!important}body.rsprinting #rsprint{display:block;color:#1d2633;font:11px/1.35 Helvetica,Arial,sans-serif}
 #rsprint header{display:flex;justify-content:space-between;gap:10px;border-bottom:2px solid #10407e;padding-bottom:6px;margin-bottom:8px}#rsprint header b{font-size:17px;color:#10407e}
 #rsprint .pp{break-inside:avoid;margin-bottom:10px}#rsprint h2{font-size:13px;color:#10407e;margin:6px 0 4px}#rsprint h2 small{font-weight:400;color:#566070}
 #rsprint table{border-collapse:collapse;width:100%}#rsprint th,#rsprint td{text-align:left;border-bottom:1px solid #e3e8ef;padding:3px 6px;vertical-align:top}#rsprint th{width:32%;color:#566070;font-weight:600}
 #rsprint .lg{font-size:9.5px;color:#566070}#rsprint .sgs{display:flex;gap:30px;margin-top:10px}#rsprint .sg img{display:block;max-width:220px}@page{size:A4;margin:12mm}}`;
const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
const ov=document.createElement("div");ov.id="rsov";ov.hidden=true;ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Réception de support");
ov.innerHTML=`<div class="mbar"><b id="rstitre">Réception de support</b><span class="s" id="rssous"></span><span class="s" id="rsglob"></span><span class="sp"></span><span id="rsetat"></span><button type="button" id="rssv">💾 Enregistrer</button><button type="button" id="rspr">🖨️ Imprimer / PDF</button><button type="button" id="rsx">Fermer</button></div>
 <div class="corps"><nav class="liste" id="rsliste" aria-label="Parties de la fiche"></nav><div class="fiche" id="rsfiche"></div></div>`;
document.body.appendChild(ov);const pr=document.createElement("div");pr.id="rsprint";document.body.appendChild(pr);
$r("rsx").onclick=()=>rsClose();$r("rssv").onclick=()=>{if(S&&!ro()){S.dirty=true;save()}};$r("rspr").onclick=()=>{save();imprimer()};
addEventListener("beforeunload",e=>{if(S&&S.dirty){save();e.preventDefault();e.returnValue=""}});
})();
