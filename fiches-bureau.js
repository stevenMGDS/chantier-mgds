// ---------- Fiches au format HTML aussi dans l'appli du bureau (Steven, 25/11/2026) ----------
// « On doit tous avoir le même niveau d'information » : la préparation et la réception de chantier (fiches-tel.js, écrites
// pour l'appli des poseurs) s'ouvrent aussi ici, avec les mêmes écrans. Ce fichier fournit à fiches-tel.js ce que
// poseurs.html lui donne (sb, chantiers, loadPlanning, nameOf, parse) et adapte les fenêtres et le retour arrière.
(()=>{
if(!window.sb&&window.sbClient)window.sb=window.sbClient;
window.chantiers=window.chantiers||{set:(id,v)=>{if(typeof jobs!=="undefined")jobs.set(id,v)},get:id=>typeof jobs!=="undefined"?jobs.get(id):null};
if(typeof window.parse!=="function")window.parse=s=>{const[y,m,d]=String(s).split("-").map(Number);return new Date(y,m-1,d)};
window.loadPlanning=window.loadPlanning||(async(a,b)=>{const c=window.sbClient;if(!c)return[];const{data}=await c.from("planning").select("*").gte("jour",a).lte("jour",b).order("jour");return data||[]});
const NOMS=new Map();let charge=false;
async function chargeNoms(){if(charge||!window.sbClient)return;charge=true;try{const{data}=await sbClient.from("profils").select("id,nom");(data||[]).forEach(p=>NOMS.set(p.id,p.nom))}catch(_){}}
if(typeof window.nameOf!=="function")window.nameOf=id=>NOMS.get(id)||"?";
// fenêtres plein écran de fiches-tel.js : pas d'entrée d'historique ici (l'appli du bureau gère déjà le retour arrière),
// « Retour » ferme seulement la fiche
const ps=history.pushState.bind(history);history.pushState=function(s,...a){if(s&&s.ftel)return;return ps(s,...a)};
const hb=history.back.bind(history);history.back=function(){const m=[...document.querySelectorAll(".modal.ftel")].pop();if(m){m.remove();if(typeof renderSheet==="function"&&typeof openId!=="undefined"&&openId)renderSheet();return}return hb()};
const st=document.createElement("style");st.textContent=`.modal.ftel{position:fixed;inset:0;z-index:70;display:flex;justify-content:center;background:var(--bg,#f5f5f7)}
.modal.ftel>div{background:var(--bg,#f5f5f7);overflow-y:auto}.modal.ftel .btn.big{width:100%}
@media print{body.ftprinting>*:not(.ftimprime){display:none!important}body.ftprinting .modal.ftel.ftimprime{position:static;display:block;background:#fff}
 body.ftprinting .ftimprime>div{height:auto!important;max-height:none!important;overflow:visible!important}body.ftprinting .ftimprime .ftbar button,body.ftprinting .ftimprime .ftpied{display:none!important}@page{size:A4;margin:12mm}}`;document.head.appendChild(st);
// « Imprimer / PDF » sur chaque fiche : imprime l'écran de la fiche tel qu'il est rempli (enregistrer en PDF depuis la fenêtre
// d'impression) ; la réception signée garde en plus son PDF daté rangé dans le chantier
function boutonImprimer(){const m=[...document.querySelectorAll(".modal.ftel")].pop();if(!m||m.querySelector("[data-ftprint]"))return;const bar=m.querySelector(".ftbar");if(!bar)return;
  const b=document.createElement("button");b.className="btn ghost";b.dataset.ftprint="1";b.textContent="🖨️ Imprimer / PDF";b.style.marginLeft="auto";
  b.onclick=()=>{m.classList.add("ftimprime");document.body.classList.add("ftprinting");const fin=()=>{m.classList.remove("ftimprime");document.body.classList.remove("ftprinting");removeEventListener("afterprint",fin)};addEventListener("afterprint",fin);setTimeout(()=>print(),50)};bar.appendChild(b)}
window.ficheBureau=async(d,j)=>{await chargeNoms();if(!window.ficheTel)return;const r=ficheTel(d,j);setTimeout(boutonImprimer,300);setTimeout(boutonImprimer,1200);return r};
})();
