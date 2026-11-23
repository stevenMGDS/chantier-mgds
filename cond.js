// ---------- Pupitres et conditionnement atelier (Steven, 23/11/2026) ----------
// Inventaire des pupitres (un numéro = une taille, numéro suivant pour une nouvelle taille) et conditionnement
// d'une commande atelier, fait seulement à la demande (Christophe, Manu, Steven) et seulement pour les menuiseries
// Technal fabriquées à l'atelier. Le calcul reprend l'outil « Transport et conditionnement » (artefact) :
// pièces (dormants / ouvrants), palettisation sur pupitres (500 kg maxi, plus longues au fond, ouvrants d'une même
// menuiserie ensemble), vues de dessus et en coupe, fiche à imprimer. Ici les pupitres viennent de l'inventaire réel.
// Tables : pupitres, conditionnements (outil/pupitres.sql).
(()=>{
"use strict";
const sbc=()=>window.sbClient;
const num=(v,d=0)=>{const x=parseFloat(String(v).replace(",","."));return isFinite(x)?x:d};
const kg=x=>Math.round(x).toLocaleString("fr-FR")+" kg";
const mm=x=>Math.round(x).toLocaleString("fr-FR");
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const role=()=>(window.mgdsProfil||{}).role||"lecteur";
const canW=()=>["editeur","atelier"].includes(role());

/* ---------- Réglages (valeurs de l'outil, modifiables, gardées sur cet appareil) ---------- */
const REG=[
 ["maxKg","Poids maxi par pupitre, hors pupitre (kg)",500],
 ["depH","Pièce plus haute que le dossier : dépassement admis (mm)",200],
 ["maxH","Hauteur chargée maxi (mm)",1700],
 ["palBase","Hauteur du socle (mm)",150],
 ["palDepth","Pupitre à fabriquer : profondeur du socle (mm)",800],
 ["margeL","Pupitre à fabriquer : jeu en longueur (mm)",0],
 ["prot","Protection par pièce (mm)",20],
 ["coffre","Coffre de volet, épaisseur (mm)",200],
 ["teteBeche","Volets tête-bêche (1 = oui, 0 = non)",1],
 ["coefAlu","Coefficient poids alu (1 = normal)",1],
 ["frappeSep","Fenêtres et portes : ouvrants séparés du cadre (1 = oui, 0 = montés)",0],
 ["sepDO","Séparer dormants et ouvrants (1 = oui, 0 = non)",1]
];
const R={hCamion:2600};
function readReg(){let s={};try{s=JSON.parse(localStorage.getItem("mgdsCondReg")||"{}")}catch(e){}REG.forEach(([k,,d])=>R[k]=num(s[k],d))}
function saveReg(o){try{localStorage.setItem("mgdsCondReg",JSON.stringify(o))}catch(e){}}
readReg();

const TYPES={fenetre:"Fenêtre / OB",porte:"Porte",fixe:"Châssis fixe",coulissant:"Coulissant",autre:"Autre (monté)"};
let lignes=[], stock=[], pupitres=[];

/* ---------- Poids ---------- */
function verreKgm2(s){
  s=String(s||"").trim(); if(!s) return 30;
  if(/^\d+([.,]\d+)?$/.test(s)) return num(s,30); // poids direct
  const parts=s.replace(/\s/g,"").split("/");
  let mmv=0,n=0;
  parts.forEach((p,i)=>{
    if(i%2===1 && parts.length>=3) return; // intercalaire
    const m=p.match(/(\d+)(?:[.,](\d))?/); if(!m) return;
    const t=m[1];
    if(m[2]!==undefined && t.length===2){mmv+=(+t[0])+(+t[1])+0.38*(+m[2]);} // feuilleté 44.2
    else if(m[2]!==undefined && t.length===3){mmv+=(+t.slice(0,2))/1+(+t[2]);}
    else mmv+=+t;
    n++;
  });
  return n? mmv*2.5 : 30;
}
const RET={fixe:[72,78],fenetre:[110,140],porte:[224,201],coulissant:[200,160],autre:[110,140]};
function surfVerre(t,W,H){const r=RET[t]||RET.autre;return Math.max(0,(W-r[0])*(H-r[1]))/1e6;}

/* ---------- Pièces ---------- */
function nomCoul(k,nv){if(nv===2)return["extérieur","intérieur"][k];if(k===0)return"extérieur";if(k===nv-1)return"intérieur";return nv===3?"milieu":"rail "+(k+1);}
function nomFrappe(k,nv){if(nv===1)return"";if(nv===2)return["gauche (vu de l'intérieur)","droit (vu de l'intérieur)"][k];return"n° "+(k+1)+" depuis la gauche";}
function pieces(){
  const P=[];
  const kgAlu=R.coefAlu;
  lignes.forEach((l,li)=>{
    const W=num(l.W),H=num(l.H),q=Math.max(0,Math.round(num(l.q,1))),nv=Math.max(1,Math.round(num(l.vt,1)));
    if(!W||!H||!q) return;
    const ext=l.vpar==="ext", face=ext?"face ext.":"face int.";
    const vk=verreKgm2(l.vitrage), sv=surfVerre(l.type,W,H);
    const perim=2*(W+H)/1000;
    const vrKg=l.vr? (4*W/1000 + 1.6*H/1000 + 4*W*H/1e6):0;
    const hVR=l.vr?100:0;
    const refs=splitRefs(l.ref,q);
    const ordre=k=>ext? nv-1-k : k; // position dans l'ordre de rangement
    for(let i=0;i<q;i++){
      const ref=refs[i], base={ref,zone:l.zone,li,inst:i,grp:li+"-"+i,face};
      if(l.type==="coulissant"){
        const lum=l.gamme==="lumeal";
        P.push({...base,label:"Cadre (dormant) de baie coulissante",short:"dormant",role:"dormant",seq:0,a:W,b:H+hVR,ep:(lum?130:110),vr:l.vr,kg:(perim*(lum?3.0:2.6))*kgAlu+vrKg,kind:"cadre"});
        const vw=W/nv+60, vh=H-60;
        for(let k=0;k<nv;k++){const nm=nomCoul(k,nv);P.push({...base,label:"Vantail "+nm+" de baie coulissante",short:"vantail "+nm.slice(0,3)+".",role:"ouvrant",seq:1+ordre(k),a:vw,b:vh,ep:(lum?65:55),vr:false,
          kg:(2*(vw+vh)/1000*(lum?2.4:2.0))*kgAlu+sv/nv*vk,kind:"ouvrant"});}
      } else if((l.type==="fenetre"||l.type==="porte")&&R.frappeSep>=1){
        const porte=l.type==="porte";
        P.push({...base,label:porte?"Cadre (dormant) de porte":"Cadre (dormant) de fenêtre",short:"dormant",role:"dormant",seq:0,a:W,b:H+hVR,ep:75,vr:l.vr,kg:perim*(porte?2.0:1.6)*kgAlu+vrKg,kind:"cadre"});
        const vw=W/nv, vh=H-40;
        for(let k=0;k<nv;k++){const nm=nomFrappe(k,nv);P.push({...base,label:(porte?"Ouvrant de porte":"Ouvrant de fenêtre")+(nm?" "+nm:""),short:"ouvrant"+(nm?" "+nm.slice(0,3)+".":""),role:"ouvrant",seq:1+ordre(k),a:vw,b:vh,ep:75,vr:false,
          kg:(2*(vw+vh)/1000*(porte?2.8:1.6))*kgAlu+sv/nv*vk,kind:"ouvrant"});}
      } else {
        let alu;
        if(l.type==="fixe") alu=perim*2.0;
        else if(l.type==="porte") alu=perim*2.0+ (2*(W/nv+H)/1000*2.8)*nv;
        else alu=perim*1.6+(2*(W/nv+H)/1000*1.6)*nv;
        const fixe=l.type==="fixe";
        P.push({...base,label:fixe?"Châssis fixe vitré":l.type==="porte"?"Porte complète (cadre + ouvrant)":"Fenêtre complète (cadre + ouvrant)",short:fixe?"fixe":"complète",role:fixe?"fixe":"monte",seq:0,a:W,b:H+hVR,
          ep:(fixe?75:90),vr:l.vr,kg:alu*kgAlu+sv*vk+vrKg,kind:fixe?"fixe":"cadre"});
      }
    }
  });
  return P;
}
function splitRefs(ref,q){
  const parts=String(ref||"").split(/\s*[\/,;]\s*/).filter(Boolean);
  if(parts.length===q) return parts;
  return Array.from({length:q},(_,i)=>q>1? (ref||"?")+" ("+(i+1)+")" : (ref||"?"));
}
const cle=p=>p.li*10000+p.inst*100+p.seq;

/* ---------- Palettisation (pupitres) ---------- */
const CAT=p=>p.role==="ouvrant"?"O":"D";
function palettiser(P){
  const pals=[], alertes=[];
  const base=R.palBase, gap=50, sep=R.sepDO>=1;
  const useStock=stock.some(s=>num(s.L)&&num(s.P)&&num(s.q));
  const dispo=useStock? stock.filter(s=>num(s.L)&&num(s.P)).map(s=>({nom:s.nom,L:num(s.L),P:num(s.P),Hd:num(s.Hd),q:Math.round(num(s.q))})) : [];
  let horsStock=0;
  const zones=[...new Set(P.map(p=>p.zone||"Sans niveau"))];
  zones.forEach(z=>{
    const ps=P.filter(p=>(p.zone||"Sans niveau")===z).map(p=>{
      const L=Math.max(p.a,p.b), S=Math.min(p.a,p.b);
      const th=p.vr? (R.teteBeche>=1? (R.coffre+p.ep)/2 : R.coffre)+R.prot : p.ep+R.prot;
      return {...p,L,S,th,mode:S+base>R.maxH?"haute":"debout"};
    });
    const gm=new Map();
    ps.forEach(p=>{const k=p.role==="ouvrant"?p.grp+"-o":p.grp+"-"+p.role+p.seq;if(!gm.has(k))gm.set(k,[]);gm.get(k).push(p);});
    const groups=[...gm.values()].map(g=>g.sort((a,b)=>a.seq-b.seq))
      .sort((a,b)=>Math.max(...b.map(p=>p.L))-Math.max(...a.map(p=>p.L))||b.reduce((s,p)=>s+p.kg,0)-a.reduce((s,p)=>s+p.kg,0));
    const zp=[];
    const tryPiece=(pal,p)=>{
      if(sep&&pal.cat!==CAT(p)) return false;
      if(pal.kg+p.kg>R.maxKg) return false;
      if(p.L>pal.L) return false;            // jamais plus long que le pupitre
      if(pal.Hd&&p.S>pal.Hd+R.depH) return false; // pas plus haut que le dossier (+ tolérance)
      if((p.mode==="haute")!==pal.haute) return false;
      let row=pal.rows.find(r=>r.len+gap+p.L<=pal.L && p.th<=r.th+5 && !(p.role==="ouvrant"&&r.items.some(x=>x.grp===p.grp)));
      if(row){row.len+=gap+p.L;row.items.push(p);}
      else{
        const used=pal.rows.reduce((s,r)=>s+r.th,0);
        if(used+p.th>pal.P) return false;
        pal.rows.push({th:p.th,len:p.L,items:[p]});
      }
      pal.items.push(p); pal.kg+=p.kg; pal.hMax=Math.max(pal.hMax,p.S); return true;
    };
    const snap=pal=>({kg:pal.kg,hMax:pal.hMax,items:[...pal.items],rows:pal.rows.map(r=>({...r,items:[...r.items]}))});
    const newPal=p=>{
      const pal={zone:z,cat:CAT(p),haute:p.mode==="haute",rows:[],items:[],kg:0,hMax:0};
      let s=null;
      if(useStock) s=dispo.filter(s=>s.q>0&&s.L>=p.L&&s.P>=Math.min(p.th,R.palDepth)&&(!s.Hd||s.Hd+R.depH>=p.S)).sort((a,b)=>a.L*a.P-b.L*b.P)[0];
      if(s){s.q--;Object.assign(pal,{L:s.L,P:s.P,Hd:s.Hd||0,stock:s.nom||"stock"});}
      else{Object.assign(pal,{L:Math.ceil((p.L+R.margeL)/100)*100,P:R.palDepth,horsStock:useStock}); if(useStock) horsStock++;}
      zp.push(pal); return pal;
    };
    const placeOne=p=>{
      for(const pal of zp) if(tryPiece(pal,p)) return;
      if(p.kg>R.maxKg) alertes.push(`${p.ref} (${p.label}) pèse environ ${kg(p.kg)} à lui seul : plus que ${kg(R.maxKg)}. Prévoir un pupitre renforcé.`);
      const pal=newPal(p);
      if(!tryPiece(pal,p)){pal.rows.push({th:p.th,len:p.L,items:[p]});pal.hMax=Math.max(pal.hMax,p.S);pal.items.push(p);pal.kg+=p.kg;}
    };
    groups.forEach(g=>{
      for(const pal of zp){const s=snap(pal);if(g.every(p=>tryPiece(pal,p)))return;Object.assign(pal,s);}
      if(g.length>1){
        const before=dispo.map(d=>d.q), hs=horsStock, pal=newPal(g[0]);
        if(g.every(p=>tryPiece(pal,p))) return;
        zp.pop(); dispo.forEach((d,i)=>d.q=before[i]); horsStock=hs;
      }
      g.forEach(placeOne);
    });
    zp.sort((a,b)=>(a.cat==="D"?0:1)-(b.cat==="D"?0:1));
    zp.forEach(pal=>{
      pal.H=Math.ceil((base+pal.hMax+20)/50)*50;
      pal.HdAff=pal.Hd||Math.max(800,Math.ceil((pal.hMax)/100)*100);
      pal.rows.forEach(r=>r.items.sort((a,b)=>cle(a)-cle(b)));
      const gk=it=>it.role==="ouvrant"?it.grp+"o":it.grp+it.role+it.seq, gl={};
      pal.items.forEach(it=>{gl[gk(it)]=Math.max(gl[gk(it)]||0,it.L);});
      pal.rows.sort((a,b)=>(gl[gk(b.items[0])]-gl[gk(a.items[0])])||(cle(a.items[0])-cle(b.items[0])));
      let alt=0;
      pal.rows.forEach(r=>r.items.forEach(it=>{
        const large=it.a>=it.b; // plus large que haute : posée dans son sens normal
        const flip=it.vr&&R.teteBeche>=1&&(alt++%2===1);
        it.haut= large ? (flip?"en bas":"en haut") : (flip?"à droite":"à gauche");
      }));
      pal.mixte=!sep && new Set(pal.items.map(CAT)).size>1;
      pal.tare=8+8*pal.L*pal.P/1e6;
      pals.push(pal);
    });
  });
  if(horsStock) alertes.push(`${horsStock} pupitre${horsStock>1?"s":""} sans pupitre de l'inventaire qui convienne (trop long, trop haut ou tous déjà pris) : à fabriquer ou à trouver.`);
  pals.forEach((p,i)=>p.n=i+1);
  return {pals,alertes};
}


const COUL={dormant:"#10407e",fixe:"#10407e",ouvrant:"#a9cdee",monte:"#136bb3"};
const TXT=r=>r==="ouvrant"?"#10407e":"#fff";
const FONT='font-family="Barlow,Arial,sans-serif"';
function catNom(p){return p.mixte?"DORMANTS ET OUVRANTS":p.cat==="O"?"OUVRANTS":"DORMANTS";}
function faceTxt(it){return it.face==="face ext."?"Face EXTÉRIEURE vers vous":"Face INTÉRIEURE vers vous";}
function sensTxt(it){
  const h=it.haut;
  const pos = h==="en haut"?"Posée droite : le haut de la menuiserie en haut"
            : h==="en bas"?"Posée tête en bas : le haut de la menuiserie contre le socle"
            : h==="à gauche"?"Posée sur le côté : le haut de la menuiserie vers votre gauche"
            : "Posée sur le côté : le haut de la menuiserie vers votre droite";
  return pos+(it.vr?" (coffre du volet = haut de la menuiserie)":"");
}
function svgDessus(p){
  const W=460,x0=36,sc=(W-x0-10)/p.L, k=Math.min(0.32,150/p.P);
  const hs=p.rows.map(r=>Math.max(16,r.th*k)); let y=34;
  const lab=(t,w)=>{const m=Math.floor(w/6.2);return t.length>m?(m>4?t.slice(0,m-1)+"…":""):t;};
  let s=`<text x="${x0}" y="12" font-size="11" fill="#566070" ${FONT}>VUE DE DESSUS</text>
  <rect x="${x0}" y="18" width="${p.L*sc}" height="12" fill="#8a6a43"/><text x="${x0+6}" y="28" font-size="10" fill="#fff" ${FONT}>DOSSIER DU PUPITRE</text>`;
  p.rows.forEach((r,i)=>{const h=hs[i];let x=x0;
    r.items.forEach(it=>{const w=it.L*sc;
      s+=`<rect x="${x}" y="${y+1}" width="${Math.max(2,w-2)}" height="${h-3}" rx="2" fill="${COUL[it.role]}"/>`;
      if(it.vr&&(it.haut==="à gauche"||it.haut==="à droite")){const cx=it.haut==="à droite"?x+w-12:x;s+=`<rect x="${cx}" y="${y+1}" width="10" height="${h-3}" fill="#000" fill-opacity=".65"/>`;}
      s+=`<text x="${x+(it.vr&&it.haut==="à gauche"?15:5)}" y="${y+h/2+3}" fill="${TXT(it.role)}" font-size="11" ${FONT}>${esc(lab(it.ref+" · "+it.short,w-20))}</text>`;
      x+=w+50*sc;});
    s+=`<text x="${x0-6}" y="${y+h/2+3}" text-anchor="end" font-size="11" fill="#566070" ${FONT}>${i+1}</text>`; y+=h;});
  s+=`<text x="${x0}" y="${y+16}" font-size="11" fill="#566070" ${FONT}>▼ VOUS (côté accès) · longueur pupitre ${mm(p.L)} mm</text>`;
  return `<svg viewBox="0 0 ${W} ${y+24}" role="img" aria-label="Vue de dessus du pupitre">${s}</svg>`;
}
function svgCoupe(p){
  const kx=170/p.P, ky=Math.min(kx,240/Math.max(p.HdAff,p.hMax)), x0=70, base=24+Math.max(p.HdAff,p.hMax)*ky, W=x0+p.P*kx+70;
  const hd=p.HdAff*ky;
  let s=`<text x="0" y="12" font-size="11" fill="#566070" ${FONT}>VUE EN COUPE (de côté)</text>
  <rect x="${x0-12}" y="${base-hd}" width="12" height="${hd}" fill="#8a6a43"/><text x="${x0-18}" y="${base-hd/2}" font-size="10" fill="#8a6a43" text-anchor="middle" transform="rotate(-90 ${x0-18} ${base-hd/2})" ${FONT}>DOSSIER ${mm(p.HdAff)}</text>
  <rect x="${x0-12}" y="${base}" width="${p.P*kx+12}" height="10" fill="#8a6a43"/><text x="${x0}" y="${base+22}" font-size="10" fill="#8a6a43" ${FONT}>SOCLE ${mm(p.P)}</text>`;
  let x=x0;
  p.rows.forEach((r,i)=>{const it=r.items.reduce((a,b)=>a.S>=b.S?a:b), w=Math.max(5,r.th*kx), h=it.S*ky;
    s+=`<rect x="${x}" y="${base-h}" width="${w-1.5}" height="${h}" fill="${COUL[it.role]}"><title>${esc(it.ref+" "+it.label)}</title></rect>`;
    if(it.vr&&(it.haut==="en haut"||it.haut==="en bas")){const ch=Math.min(h/3,R.coffre*ky);s+=`<rect x="${x}" y="${it.haut==="en haut"?base-h:base-ch}" width="${w-1.5}" height="${ch}" fill="#000" fill-opacity=".65"/>`;}
    if(w>=11) s+=`<text x="${x+w/2+3}" y="${base-h/2}" font-size="9" fill="${TXT(it.role)}" text-anchor="middle" transform="rotate(-90 ${x+w/2} ${base-h/2})" ${FONT}>${it.face==="face ext."?"EXT":"INT"} ▸</text>`;
    s+=`<text x="${x+w/2}" y="${base-h-4}" font-size="10" fill="#1d2633" text-anchor="middle" ${FONT}>${i+1}</text>`;
    x+=w;});
  s+=`<text x="${W-2}" y="${base-20}" font-size="11" fill="#566070" text-anchor="end" ${FONT}>VOUS ▸</text>`;
  return `<svg viewBox="0 0 ${W} ${base+28}" role="img" aria-label="Vue en coupe du pupitre" style="max-height:330px">${s}</svg>`;
}
function fiche(p,total){
  const st=p.stock?`<span class="cftag">pupitre de l'inventaire n° ${esc(p.stock)}</span>`:p.horsStock?`<span class="cftag w">à fabriquer : aucun pupitre de l'inventaire ne convient</span>`:"";
  const hors=p.H>R.hCamion?`<span class="cftag w">trop haut pour un camion standard</span>`:p.haute?`<span class="cftag w">pupitre haut</span>`:"";
  const lignesR=p.rows.map((r,i)=>r.items.map((it,j)=>`<tr><td class="rg">${j?"":i+1}</td><td><b>${esc(it.ref)}</b></td><td>${esc(it.label)}${j?` <span class="foot">(à côté, bout à bout)</span>`:""}</td><td class="n">${mm(it.L)} × ${mm(it.S)}</td><td><b>${faceTxt(it)}</b><br><span class="foot">${esc(sensTxt(it))}</span></td></tr>`).join("")).join("");
  return `<div class="fiche">
   <div class="fh"><div><div class="fn">PUPITRE ${p.n} / ${total}${p.stock?" · n° "+esc(p.stock):""}</div><div class="ft">${esc(p.zone)} · ${catNom(p)}</div></div>
   <div class="fr"><div>Long. ${mm(p.L)} · socle ${mm(p.P)} · haut. ${mm(p.H)} mm</div><div>${kg(p.kg)} <span class="foot">+ pupitre ${kg(p.tare)}</span></div></div></div>
   <div class="cfrow" style="gap:6px">${st}${hors}${p.cat==="D"&&!p.mixte?`<span class="cftag">à poser en premier</span>`:`<span class="cftag">à poser après les dormants</span>`}</div>
   <div class="vues">${svgDessus(p)}${svgCoupe(p)}</div>
   <table class="ft2"><thead><tr><th>Rang</th><th>Repère</th><th>Pièce</th><th class="n">Long. × haut. (mm)</th><th>Sens</th></tr></thead><tbody>${lignesR}</tbody></table>
  </div>`;
}
const LEXIQUE=`<div class="lex"><b>Comment lire cette fiche</b>
 <ul><li><b>Pupitre</b> : palette avec un socle et un dossier. Les pièces sont posées debout sur leur côté le plus long, appuyées contre le dossier.</li>
 <li><b>Rang 1</b> : la première pièce posée, contre le dossier. Puis le rang 2 contre le rang 1, et ainsi de suite vers vous. Les pièces les plus longues sont au fond, les plus courtes devant.</li>
 <li><b>Dormant</b> (bleu foncé) : le cadre fixé au mur. Il se pose en premier sur le chantier. <b>Ouvrant / vantail</b> (bleu clair) : la partie qui s'ouvre ou qui coulisse, posée après. <b>Menuiserie complète</b> (bleu moyen) : cadre et ouvrant livrés montés.</li>
 <li><b>Face intérieure</b> : le côté qui sera à l'intérieur de la maison. « Face intérieure vers vous » : ce côté regarde à l'opposé du dossier. Le bloc noir est le coffre du volet roulant.</li>
 <li>Ne jamais dépasser du pupitre en longueur. 500 kg maximum par pupitre.</li></ul></div>`;
const FICHE_CSS=`.fiche{border:1px solid #d3dae4;border-radius:12px;padding:12px 14px;display:grid;gap:10px;background:#fff;break-inside:avoid;page-break-inside:avoid;color:#1d2633}
.fh{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;background:#10407e;color:#fff;border-radius:8px;padding:10px 12px}
.fn{font:700 26px/1 "Barlow Semi Condensed",Arial,sans-serif;letter-spacing:.02em}.ft{font:600 16px "Barlow Semi Condensed",Arial,sans-serif;color:#c9dcf5}
.fr{text-align:right;font:600 15px Barlow,Arial,sans-serif}.fr .foot{color:#c9dcf5}
.vues{display:grid;grid-template-columns:1.6fr 1fr;gap:12px;align-items:end}.vues svg{width:100%;height:auto}
.ft2{width:100%;border-collapse:collapse;font-size:14px}.ft2 th{font:600 11px Barlow,Arial;letter-spacing:.05em;text-transform:uppercase;color:#566070;text-align:left;border-bottom:2px solid #d3dae4;padding:5px}
.ft2 td{border-bottom:1px solid #d3dae4;padding:5px;vertical-align:top}.ft2 .rg{font:700 20px "Barlow Semi Condensed",Arial;color:#10407e;text-align:center;width:44px}
.ft2 .n{text-align:right;white-space:nowrap}
.lex{background:#e8eff8;border-radius:8px;padding:10px 14px;font-size:14px;color:#1d2633}.lex ul{margin:6px 0 0;padding-left:18px;display:grid;gap:3px}
.cftag{display:inline-block;font:600 11px Barlow,Arial;letter-spacing:.05em;text-transform:uppercase;border-radius:4px;padding:2px 6px;background:#e8eff8;color:#10407e}.cftag.w{background:#fff4d6;color:#5c4300}
.foot{color:#566070;font-size:12px}.cfrow{display:flex;flex-wrap:wrap;align-items:center}
@media(max-width:700px){.vues{grid-template-columns:1fr}}`;

/* ---------- Lecture du devis ---------- */
function lireDevis(txt){
  const L=txt.split(/\r?\n/).map(s=>s.replace(/ /g," ").trim()).filter(Boolean);
  const out=[]; let cur=null, keller=false, ignores=[];
  const hdr=/^(ME\s?\d+[a-zA-Z]?(?:\s?\/\s?(?:ME\s?)?\d+[a-zA-Z]?)*)\s*[-–]\s*([^:]*?)\s*:\s*(.*)$/i;
  for(let i=0;i<L.length;i++){
    const s=L[i];
    const m=s.match(hdr);
    if(m){
      const ref=m[1].replace(/\s+/g,"").toUpperCase().split("/").map(x=>/^\d/.test(x)?"ME"+x:x).join(" / ");
      let rest=m[3];
      const qm=rest.match(/\s(\d{1,3})\s+\d{1,3}(?:[  ]\d{3})*,\d{2}/);
      const q=qm?+qm[1]:1;
      const desig=(qm?rest.slice(0,qm.index):rest)+" "+(L[i+1]||"");
      if(/volet/i.test(desig)){
        const tgt=[...out].reverse().find(o=>o.ref===ref)||cur; if(tgt) tgt.vr=true; cur=null; continue;
      }
      if(/garage|motorisation|store/i.test(desig)){ignores.push(ref);cur=null;continue;}
      cur={ref,type:"autre",gamme:"soleal",W:"",H:"",q,vt:1,vitrage:"",vpar:"int",vr:false,zone:""};
      typer(cur,desig); out.push(cur); continue;
    }
    if(/^Keller\b/i.test(s)){keller=true;cur=null;continue;}
    if(!cur) continue;
    let mm2;
    if((mm2=s.match(/^Largeur\s*:\s*([\d\s ]+)\s*mm/i))) cur.W=+mm2[1].replace(/\D/g,"");
    else if((mm2=s.match(/^Hauteur\s*:\s*([\d\s ]+)\s*mm/i))) cur.H=+mm2[1].replace(/\D/g,"");
    else if(/^(Porte|Fenêtre|Coulissant|Châssis|Chassis)/i.test(s)) typer(cur,s);
    else if((mm2=s.match(/(?:Double|Triple)\s+Vitrage\s+(.+)$/i))&&!cur.vitrage){
      cur.vitrage=mm2[1].replace(/\s*(Dépoli|satin|déco)\s*/gi,"").replace(/\s*(rT+herm|\+|argon).*$/i,"").replace(/W(\d+)N?/g,"$1").replace(/\s+/g,"");
    }
  }
  return {out:out.filter(o=>o.W&&o.H),keller,ignores};
}
function typer(o,s){
  const t=s.toLowerCase();
  if(/coulissant/.test(t)){o.type="coulissant";const v=t.match(/(\d)\s*vtx/);o.vt=v?+v[1]:2;}
  else if(/ch[aâ]ssis fixe|fixe/.test(t)&&!/porte|fen[eê]tre|oscillo/.test(t)) {o.type="fixe";o.vt=1;}
  else if(/porte/.test(t)){o.type="porte";const v=t.match(/(\d)\s*(vtl|vtx|vantaux|vantail)/);o.vt=v?+v[1]:1;}
  else if(/fen[eê]tre|oscillo|ob\b|of\b/.test(t)){o.type="fenetre";const v=t.match(/(\d)\s*(vtl|vtx|vantaux|vantail)/);o.vt=v?+v[1]:1;}
  if(/lum[eé]al/.test(t)) o.gamme="lumeal";
}

/* ---------- Fiche imprimable ---------- */
function ficheDoc(titre,pals){
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Conditionnement ${esc(titre)}</title>
<style>body{font:15px/1.4 Barlow,Arial,sans-serif;margin:16px;color:#1d2633}h1{font:700 28px "Barlow Semi Condensed",Arial;color:#10407e;margin:0 0 4px}${FICHE_CSS}
.wrapf{display:grid;gap:16px}@media print{body{margin:0}.fiche{page-break-after:always}}</style></head><body>
<h1>Fiche de conditionnement · ${esc(titre)}</h1><p class="foot">MGDS Menuiserie · ${pals.length} pupitre${pals.length>1?"s":""} · ordre de pose : d'abord les pupitres de dormants, puis ceux d'ouvrants.</p>
<div class="wrapf">${LEXIQUE}${pals.map(p=>fiche(p,pals.length)).join("")}</div></body></html>`;
}

/* ---------- Écran plein (même principe que le métré) ---------- */
const CSS=`#cdov{position:fixed;inset:0;z-index:60;background:var(--bg);overflow:auto;-webkit-overflow-scrolling:touch}
#cdov[hidden]{display:none!important}
#cdov .cdw{max-width:1180px;margin:0 auto;padding:12px 16px 60px;display:grid;gap:14px}
#cdov .cdbar{position:sticky;top:0;z-index:2;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:var(--bg);padding:8px 0;border-bottom:1px solid var(--line)}
#cdov .cdbar b{font-size:18px;flex:1 1 auto;min-width:0}
#cdov .cdp{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px;display:grid;gap:10px;min-width:0}
#cdov h3{margin:0;font-size:17px}
#cdov .sub{color:var(--muted);font-size:13px}
#cdov .tw{overflow-x:auto}
#cdov table.cdt{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}
#cdov .cdt th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);text-align:left;padding:5px;border-bottom:2px solid var(--line);white-space:nowrap}
#cdov .cdt td{padding:3px 4px;border-bottom:1px solid var(--line)}
#cdov .cdt input,#cdov .cdt select{font:500 14px var(--f-body,inherit);padding:5px 6px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink);width:100%;min-width:0}
#cdov .cdt .n{text-align:right}
#cdov .w60{width:64px}#cdov .w80{width:84px}#cdov .w110{width:112px}
#cdov .cdk{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
#cdov .cdk div{background:var(--sunk);border-radius:8px;padding:8px 12px}#cdov .cdk b{display:block;font-size:24px}#cdov .cdk span{font-size:13px;color:var(--muted)}
#cdov .warn{background:#fff4d6;color:#5c4300;border-radius:8px;padding:8px 10px;font-size:14px}
#cdov .okn{background:#e3f3ea;color:#14532d;border-radius:8px;padding:8px 10px;font-size:14px}
#cdov .cdfs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
#cdov .cdfs label{display:grid;gap:3px;font-size:13px;color:var(--muted)}
#cdov .cdfs input{font:500 15px inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)}
#cdov .add{display:flex;flex-wrap:wrap;gap:6px;align-items:end}
#cdov .add label{display:grid;gap:2px;font-size:12px;color:var(--muted)}
#cdov .add input{width:100px;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)}
#cdov .pals{display:grid;gap:16px}
#cdov .x{background:none;border:0;color:var(--muted);font-size:16px;cursor:pointer}
${FICHE_CSS}`;
function ov(){let o=document.getElementById("cdov");
  if(!o){const st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);
    o=document.createElement("div");o.id="cdov";o.hidden=true;o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");document.body.appendChild(o);
    o.addEventListener("click",e=>{if(e.target.closest("[data-cdx]"))fermer()})}
  return o}
function fermer(){if(st.dirty&&!confirm("Des changements ne sont pas enregistrés. Fermer quand même ?"))return;st.dirty=false;ov().hidden=true;document.body.style.overflow=""}
const st={a:null,c:null,row:null,dirty:false,ignores:[],src:""};

/* ---------- Inventaire des pupitres ---------- */
async function pupLoad(){const{data,error}=await sbc().from("pupitres").select("*").order("numero");if(error)throw error;pupitres=data||[];
  stock=pupitres.filter(p=>p.quantite>0).map(p=>({nom:String(p.numero),L:p.longueur_mm,P:p.profondeur_mm,Hd:p.hauteur_mm,q:p.quantite}));return pupitres}
const nonActive=e=>`<div class="warn">Les pupitres ne sont pas encore activés dans la base : il faut coller <b>outil/pupitres.sql</b> dans Supabase (${esc(e&&e.message||e)}).</div>`;
async function pupOpen(){const o=ov();o.hidden=false;document.body.style.overflow="hidden";
  o.innerHTML=`<div class="cdw"><div class="cdbar"><button class="btn ghost" data-cdx>◀ Fermer</button><b>🪵 Pupitres de l'atelier</b></div><div id="cdpCorps"><span class="sub">Chargement…</span></div></div>`;
  try{await pupLoad()}catch(e){document.getElementById("cdpCorps").innerHTML=nonActive(e);return}
  pupRender()}
function pupRender(){const W=canW(),ro=W?"":"disabled",tot=pupitres.reduce((s,p)=>s+(+p.quantite||0),0),next=Math.max(0,...pupitres.map(p=>p.numero))+1;
  const f=v=>(v/1000).toLocaleString("fr-FR",{minimumFractionDigits:2})+" m";
  document.getElementById("cdpCorps").innerHTML=`<div class="cdp">
   <p class="sub" style="margin:0">Un numéro = une taille de pupitre : plusieurs pupitres peuvent porter le même numéro. Une nouvelle taille prend le numéro suivant (prochain : <b>${next}</b>), à écrire sur le pupitre. Cotes en mm (11 dm = 1 100 mm).</p>
   <div class="tw"><table class="cdt"><thead><tr><th>N°</th><th class="n">Socle L (mm)</th><th class="n">Socle P (mm)</th><th class="n">Dossier H (mm)</th><th class="n">Quantité</th><th>Note</th></tr></thead><tbody>
   ${pupitres.map(p=>`<tr data-pn="${p.numero}"><td><b style="font-size:18px">${p.numero}</b></td>${["longueur_mm","profondeur_mm","hauteur_mm","quantite"].map(k=>`<td class="n"><input type="number" min="0" inputmode="numeric" class="w80" data-pk="${k}" value="${esc(p[k])}" ${ro} aria-label="${k}"></td>`).join("")}<td><input type="text" data-pk="note" value="${esc(p.note||"")}" ${ro} aria-label="Note"></td></tr>`).join("")}
   <tr><td><b>Total</b></td><td colspan="3" class="sub">${pupitres.filter(p=>p.quantite>0).map(p=>`n° ${p.numero} = ${f(p.longueur_mm)} × ${f(p.profondeur_mm)}`).join(" · ")}</td><td class="n"><b>${tot}</b></td><td></td></tr></tbody></table></div>
   ${W?`<form class="add" id="pupAdd"><b style="align-self:center">Nouvelle taille n° ${next}</b><label>Socle L (mm)<input type="number" min="1" id="pa-l" required inputmode="numeric"></label><label>Socle P (mm)<input type="number" min="1" id="pa-p" required inputmode="numeric"></label><label>Dossier H (mm)<input type="number" min="1" id="pa-h" required inputmode="numeric" value="1500"></label><label>Quantité<input type="number" min="1" id="pa-q" value="1" inputmode="numeric"></label><button class="btn">Ajouter</button></form>`:`<p class="sub">Seuls l'atelier et le bureau modifient l'inventaire.</p>`}
   <p class="sub" id="pupMsg" aria-live="polite"></p></div>`;
  const c=document.getElementById("cdpCorps");
  c.querySelectorAll("[data-pk]").forEach(i=>i.addEventListener("change",async()=>{const n=+i.closest("tr").dataset.pn,k=i.dataset.pk,v=k==="note"?i.value.trim():Math.max(0,Math.round(num(i.value)));
    const{error}=await sbc().from("pupitres").update({[k]:v}).eq("numero",n);document.getElementById("pupMsg").textContent=error?"Non enregistré : "+error.message:"Enregistré.";
    if(!error){const p=pupitres.find(x=>x.numero===n);p[k]=v}}));
  const fa=document.getElementById("pupAdd");if(fa)fa.addEventListener("submit",async e=>{e.preventDefault();
    const row={numero:next,longueur_mm:Math.round(num(document.getElementById("pa-l").value)),profondeur_mm:Math.round(num(document.getElementById("pa-p").value)),hauteur_mm:Math.round(num(document.getElementById("pa-h").value)),quantite:Math.max(1,Math.round(num(document.getElementById("pa-q").value,1)))};
    const{error}=await sbc().from("pupitres").insert(row);if(error){document.getElementById("pupMsg").textContent="Non enregistré : "+error.message;return}
    await pupLoad();pupRender();document.getElementById("pupMsg").textContent=`Pupitre n° ${row.numero} ajouté : écrivez « ${row.numero} » dessus.`})}

/* ---------- Lecture du devis du chantier (PDF de l'appli) ---------- */
async function texteDevis(doc){
  const{data,error}=await sbc().storage.from("documents").download(doc.id);if(error)throw error;
  pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf=await pdfjsLib.getDocument({data:await data.arrayBuffer()}).promise,out=[];
  for(let n=1;n<=pdf.numPages;n++){const tc=await (await pdf.getPage(n)).getTextContent(),m=new Map();
    tc.items.filter(t=>t.str.trim()).forEach(t=>{const y=Math.round(t.transform[5]/3);let k=[...m.keys()].find(k=>Math.abs(k-y)<=1);if(k===undefined){k=y;m.set(k,[])}m.get(k).push(t)});
    [...m.entries()].sort((a,b)=>b[0]-a[0]).forEach(([,it])=>out.push(it.sort((a,b)=>a.transform[4]-b.transform[4]).map(t=>t.str).join(" ").replace(/\s+/g," ")))}
  return out.join("\n")}
const devisDoc=c=>c?(c.docs||[]).filter(d=>d.type==="Devis"&&/\.pdf$/i.test(d.name||"")).sort((x,y)=>String(y.at||"").localeCompare(String(x.at||"")))[0]:null;
async function lignesDepart(a,c){
  const d=devisDoc(c);
  if(d){try{const r=lireDevis(await texteDevis(d));if(r.out.length){st.ignores=r.ignores;st.src=`lu dans le devis « ${d.name} »`+(r.keller?" (Keller : livré par le fournisseur, non palettisé)":"");return r.out}}catch(e){console.warn(e)}}
  const L=(a.lignes||[]).filter(l=>num(l.l)&&num(l.h)).map(l=>{const o={ref:l.rep||"?",type:"autre",gamme:"soleal",W:num(l.l),H:num(l.h),q:Math.max(1,num(l.q,1)),vt:1,vitrage:"",vpar:"int",vr:false,zone:""};typer(o,l.des||"");return o});
  if(L.length){st.src="repris des lignes de l'ARC atelier";return L}
  st.src="aucun devis lisible ni ligne d'ARC : saisissez les menuiseries";return []}

/* ---------- Conditionnement d'une commande atelier ---------- */
async function condOpen(a,c){st.a=a;st.c=c||null;st.dirty=false;st.ignores=[];st.src="";const o=ov();o.hidden=false;document.body.style.overflow="hidden";
  const titre=(a.client||(c&&c.client)||a.chantier||a.id);
  o.innerHTML=`<div class="cdw"><div class="cdbar"><button class="btn ghost" data-cdx>◀ Fermer</button><b>📦 Conditionnement · ${esc(titre)} <span class="sub">${esc(a.id)}${a.chantier?" · "+esc(a.chantier):""}</span></b>
    <span id="cdEtat" class="sub"></span>${canW()?`<button class="btn ghost" id="cdSave">Enregistrer</button><button class="btn" id="cdVal">Valider</button>`:""}<button class="btn ghost" id="cdPrint">🖨️ Fiches</button></div>
    <div id="cdCorps"><span class="sub">Chargement des pupitres et du devis…</span></div></div>`;
  try{await pupLoad()}catch(e){document.getElementById("cdCorps").innerHTML=nonActive(e);return}
  const{data:rows,error}=await sbc().from("conditionnements").select("*").eq("atelier_id",a.id).limit(1);
  if(error){document.getElementById("cdCorps").innerHTML=nonActive(error);return}
  st.row=rows&&rows[0]||null;
  if(st.row&&Array.isArray(st.row.lignes)&&st.row.lignes.length){lignes=st.row.lignes;st.src="conditionnement enregistré le "+new Date(st.row.maj_le).toLocaleDateString("fr-FR")}
  else lignes=await lignesDepart(a,c);
  const W=canW();
  document.getElementById("cdCorps").innerHTML=`<div class="cdw" style="padding:0">
   <section class="cdp"><h3>1. Les menuiseries de l'atelier</h3>
    <p class="sub" style="margin:0">Seulement les menuiseries Technal fabriquées à l'atelier. Les volets, la porte de garage, les Keller et les autres produits livrés par les fournisseurs ne sont pas palettisés. Lignes ${esc(st.src)}${st.ignores.length?" · non palettisé : "+esc(st.ignores.join(", ")):""}. Indiquez le <b>niveau</b> de chaque ligne : les pupitres sont faits par niveau.</p>
    <div class="tw"><table class="cdt" id="cdL"><thead><tr><th>Repère</th><th>Type</th><th>Gamme</th><th class="n">Larg.</th><th class="n">Haut.</th><th class="n">Qté</th><th class="n">Vtx</th><th>Vitrage</th><th>Vitré par</th><th>VR</th><th>Niveau</th><th></th></tr></thead><tbody></tbody></table></div>
    ${W?`<div><button class="btn ghost" id="cdAdd">+ Ajouter une ligne</button> <span class="sub">Dimensions en mm. Vtx = vantaux. VR = volet roulant monté dessus.</span></div>`:""}
   </section>
   <section class="cdp"><h3>2. Résultat</h3><div class="cdk" id="cdK"></div><div id="cdA" style="display:grid;gap:6px"></div><div class="pals" id="cdP"></div>
    <details><summary>Détail des pièces</summary><div class="tw"><table class="cdt" id="cdD"><thead><tr><th>Pièce</th><th>Niveau</th><th class="n">Long.</th><th class="n">Larg.</th><th class="n">Épaisseur</th><th class="n">Poids</th><th>Rangement</th><th class="n">Pupitre</th></tr></thead><tbody></tbody></table></div></details></section>
   <section class="cdp"><details><summary><b>Réglages du calcul</b> <span class="sub">(gardés sur cet appareil)</span></summary><div class="cdfs" id="cdR" style="margin-top:8px">${REG.map(([k,l])=>`<label>${esc(l)}<input type="number" step="any" data-rk="${k}" value="${R[k]}"></label>`).join("")}</div>
    <p class="sub">Règles : pièces posées à champ, côté le plus long sur le socle, jamais plus longues que le pupitre ; rang 1 contre le dossier, les plus longues au fond ; ouvrants d'une même menuiserie ensemble et dans l'ordre ; dormants et ouvrants sur des pupitres séparés, par niveau ; 500 kg maxi hors pupitre ; volets tête-bêche. On prend le plus petit pupitre de l'inventaire qui convient ; sinon « à fabriquer ».</p></details></section></div>`;
  renderLignes();calc();etat();
  const L=document.getElementById("cdL");
  L.addEventListener("input",e=>{const tr=e.target.closest("tr[data-i]");if(!tr)return;const l=lignes[+tr.dataset.i],k=e.target.dataset.k;if(!k)return;l[k]=e.target.type==="checkbox"?e.target.checked:e.target.value;st.dirty=true;etat();calc()});
  L.addEventListener("click",e=>{const d=e.target.dataset.del;if(d!==undefined){lignes.splice(+d,1);st.dirty=true;renderLignes();calc();etat()}});
  const ad=document.getElementById("cdAdd");if(ad)ad.onclick=()=>{lignes.push({ref:"",type:"fenetre",gamme:"soleal",W:"",H:"",q:1,vt:1,vitrage:"44.2/16/4",vpar:"int",vr:false,zone:lignes.length?lignes[lignes.length-1].zone:"RDC"});st.dirty=true;renderLignes();etat()};
  document.getElementById("cdR").addEventListener("input",()=>{const o={};document.querySelectorAll("#cdR [data-rk]").forEach(i=>o[i.dataset.rk]=i.value);saveReg(o);readReg();calc()});
  const sv=document.getElementById("cdSave");if(sv)sv.onclick=()=>enregistrer(null);
  const vl=document.getElementById("cdVal");if(vl)vl.onclick=()=>enregistrer("valide");
  document.getElementById("cdPrint").onclick=imprimer}
function etat(){const e=document.getElementById("cdEtat");if(!e)return;const r=st.row;
  e.textContent=st.dirty?"modifié, pas enregistré":r?(r.statut==="valide"?"✓ validé":"brouillon")+" · "+new Date(r.maj_le).toLocaleDateString("fr-FR"):"nouveau, pas encore enregistré"}
function renderLignes(){const W=canW(),ro=W?"":"disabled",tb=document.querySelector("#cdL tbody");
  tb.innerHTML=lignes.map((l,i)=>`<tr data-i="${i}">
   <td><input class="w110" data-k="ref" value="${esc(l.ref)}" ${ro}></td>
   <td><select data-k="type" ${ro}>${Object.entries(TYPES).map(([k,v])=>`<option value="${k}"${l.type===k?" selected":""}>${v}</option>`).join("")}</select></td>
   <td><select data-k="gamme" ${ro}><option value="soleal"${l.gamme!=="lumeal"?" selected":""}>Soléal</option><option value="lumeal"${l.gamme==="lumeal"?" selected":""}>Luméal</option></select></td>
   <td><input class="w80" data-k="W" type="number" value="${esc(l.W)}" ${ro}></td><td><input class="w80" data-k="H" type="number" value="${esc(l.H)}" ${ro}></td>
   <td><input class="w60" data-k="q" type="number" min="1" value="${esc(l.q)}" ${ro}></td><td><input class="w60" data-k="vt" type="number" min="1" value="${esc(l.vt)}" ${ro}></td>
   <td><input class="w110" data-k="vitrage" value="${esc(l.vitrage)}" ${ro}></td>
   <td><select data-k="vpar" ${ro}><option value="int"${l.vpar!=="ext"?" selected":""}>Intérieur</option><option value="ext"${l.vpar==="ext"?" selected":""}>Extérieur</option></select></td>
   <td style="text-align:center"><input type="checkbox" data-k="vr"${l.vr?" checked":""} aria-label="Volet roulant" ${ro} style="width:auto"></td>
   <td><input class="w80" data-k="zone" value="${esc(l.zone)}" list="cdZones" placeholder="RDC" ${ro}></td>
   <td>${W?`<button type="button" class="x" data-del="${i}" aria-label="Supprimer">✕</button>`:""}</td></tr>`).join("")||`<tr><td colspan="12" class="sub">Aucune menuiserie.</td></tr>`;
  let zl=document.getElementById("cdZones");if(!zl){zl=document.createElement("datalist");zl.id="cdZones";document.body.appendChild(zl)}
  zl.innerHTML=["RDJ","RDC","R+1","R+2","Combles",...new Set(lignes.map(l=>l.zone).filter(Boolean))].filter((v,i,a)=>a.indexOf(v)===i).map(z=>`<option value="${esc(z)}">`).join("")}
let dernier=[];
function calc(){
  const P=pieces();const{pals,alertes}=palettiser(P);dernier=pals;
  const parN={};pals.forEach(p=>{const k=p.stock?"n° "+p.stock:"à fabriquer";parN[k]=(parN[k]||0)+1});
  // ce qui manque dans l'inventaire
  const manque=pupitres.filter(p=>p.quantite>0&&(parN["n° "+p.numero]||0)>=p.quantite).map(p=>p.numero);
  document.getElementById("cdK").innerHTML=[
    [pals.length,"pupitre"+(pals.length>1?"s":"")+" : "+pals.filter(p=>p.cat==="D"&&!p.mixte).length+" dormants, "+pals.filter(p=>p.cat==="O"&&!p.mixte).length+" ouvrants"],
    [Object.entries(parN).sort().map(([k,n])=>n+" × "+k).join(" · ")||"–","pupitres utilisés"],
    [kg(P.reduce((s,p)=>s+p.kg,0)),"menuiseries (hors pupitres)"],
    [P.length,"pièces à ranger"]].map(k=>`<div><b>${esc(k[0])}</b><span>${esc(k[1])}</span></div>`).join("");
  const al=[...alertes];
  if(manque.length)al.push(`Tous les pupitres n° ${manque.join(", ")} de l'inventaire sont pris par ce chantier : vérifier qu'ils ne sont pas déjà partis sur un autre.`);
  if(pals.some(p=>p.haute))al.push(`Pupitres hauts (pièces de plus de ${mm(R.maxH-R.palBase)} mm de large, posées à champ) : jusqu'à ${mm(Math.max(...pals.filter(p=>p.haute).map(p=>p.H)))} mm de haut.`);
  const trop=pals.filter(p=>p.H>R.hCamion);if(trop.length)al.push(`Pupitre${trop.length>1?"s":""} ${trop.map(p=>p.n).join(", ")} : plus haut que la hauteur utile d'un camion standard (${mm(R.hCamion)} mm).`);
  document.getElementById("cdA").innerHTML=al.map(a=>`<div class="warn">${esc(a)}</div>`).join("")||(pals.length?`<div class="okn">Tout tient sur les pupitres de l'inventaire.</div>`:"");
  document.getElementById("cdP").innerHTML=pals.length?LEXIQUE+pals.map(p=>fiche(p,pals.length)).join(""):`<p class="sub">Aucune pièce à palettiser.</p>`;
  document.querySelector("#cdD tbody").innerHTML=pals.flatMap(p=>p.items.map(i=>`<tr><td>${esc(i.ref)} <span class="sub">${esc(i.label)}${i.vr?" + volet":""}</span></td><td>${esc(i.zone)}</td><td class="n">${mm(i.L)}</td><td class="n">${mm(i.S)}</td><td class="n">${mm(i.th)}</td><td class="n">${kg(i.kg)}</td><td>${esc(faceTxt(i))}, ${esc(i.haut)}</td><td class="n">${p.n}${p.stock?" (n° "+esc(p.stock)+")":""}</td></tr>`)).join("")}
function resume(){return dernier.map(p=>({n:p.n,numero:p.stock?+p.stock:null,L:p.L,P:p.P,H:p.H,zone:p.zone,cat:p.mixte?"mixte":p.cat==="O"?"ouvrants":"dormants",kg:Math.round(p.kg),
  rangs:p.rows.map(r=>r.items.map(it=>({ref:it.ref,piece:it.label,face:it.face,haut:it.haut})))}))}
async function enregistrer(statut){const a=st.a,m=document.getElementById("cdEtat");
  const row={atelier_id:a.id,chantier:a.chantier||null,lignes,resultat:{pupitres:resume(),reglages:{...R}},statut:statut||(st.row?st.row.statut:"brouillon"),maj_le:new Date().toISOString()};
  if(statut==="valide"&&lignes.some(l=>!String(l.zone||"").trim())&&!confirm("Certaines lignes n'ont pas de niveau : elles seront rangées ensemble. Valider quand même ?"))return;
  const q=st.row?sbc().from("conditionnements").update(row).eq("id",st.row.id).select():sbc().from("conditionnements").insert(row).select();
  const{data,error}=await q;if(error){m.textContent="Non enregistré : "+error.message;return}
  st.row=data&&data[0]||st.row;st.dirty=false;etat()}
function imprimer(){const a=st.a,t=(a.client||(st.c&&st.c.client)||a.chantier||"")+" · "+a.id;
  const w=window.open("","_blank");if(!w){alert("Le navigateur a bloqué la fenêtre d'impression.");return}
  w.document.write(ficheDoc(t,dernier));w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(e){}},400)}

window.pupOpen=pupOpen;window.condOpen=condOpen;
window.addEventListener("keydown",e=>{if(e.key==="Escape"){const o=document.getElementById("cdov");if(o&&!o.hidden)fermer()}});
})();
