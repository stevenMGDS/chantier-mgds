// Chantiers MGDS, version autonome : remplace les services claude.ai (base, utilisateur, documents, téléchargement) par Supabase.
// L'appli elle-même (chantiers-mgds.html) reste identique ; ce fichier est injecté avant son script par build.sh.
(()=>{
const SB_URL="https://azgvzgenfykvlkuwevty.supabase.co";
const SB_KEY="sb_publishable_Is-KNNP223DIxMk8kzrYww_PynSCb23"; // clé publique, faite pour le navigateur : les droits sont contrôlés par la base
const BUCKET="documents";
// lien d'invitation ou de mot de passe oublié : à lire avant que supabase-js ne nettoie l'adresse
const fromLink=/type=(invite|recovery|signup)/.test(location.hash)||/type=(invite|recovery)/.test(location.search);
const sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.sbClient=sb;

let session=null,profil=null,readyRes;
const ready=new Promise(r=>readyRes=r);
const err=(code,msg)=>Object.assign(new Error(msg||code),{code});

// ---------- écran de connexion ----------
const css=`.gate{position:fixed;inset:0;z-index:100;background:var(--bg,#EEF0F1);display:grid;place-items:center;padding:16px}
.gate form{background:var(--surface,#fff);border:1px solid var(--line,#D3D8DC);border-radius:12px;padding:24px;width:min(380px,100%);display:grid;gap:12px;font-family:var(--f-body,Arial,sans-serif);color:var(--ink,#2E3438)}
.gate h1{margin:0;font:700 26px var(--f-display,Arial)}.gate p{margin:0;color:var(--muted,#5F6A73);font-size:14px}
.gate label{display:grid;gap:4px;font-size:13px;font-weight:600}
.gate input{font:inherit;font-size:16px;padding:10px 12px;border:1px solid var(--line,#D3D8DC);border-radius:8px;background:var(--surface,#fff);color:inherit}
.gate button{font:600 15px var(--f-body,Arial);padding:11px;border-radius:8px;border:0;background:var(--accent,#1F5F8B);color:var(--accent-ink,#fff);cursor:pointer}
.gate button.link{background:none;color:var(--accent,#1F5F8B);padding:4px;font-weight:500}
.gate .msg{min-height:1.2em;font-size:14px;color:var(--s-rouge,#CC4141)}.gate .msg.ok{color:var(--s-vert,#469A61)}
.who{position:fixed;right:12px;bottom:12px;z-index:30;font:500 12px var(--f-body,Arial);background:var(--surface,#fff);border:1px solid var(--line,#D3D8DC);border-radius:999px;padding:6px 10px;color:var(--muted,#5F6A73);display:flex;gap:8px;align-items:center}
.who button{font:inherit;background:none;border:0;color:var(--accent,#1F5F8B);cursor:pointer;padding:0}`;
document.head.insertAdjacentHTML("beforeend",`<style>${css}</style>`);

function gate(mode,note){
  document.querySelector(".gate")?.remove();
  const g=document.createElement("div");g.className="gate";
  const pw=mode==="setpw";
  g.innerHTML=`<form novalidate><h1>Chantiers MGDS</h1>
   <p>${pw?"Choisissez votre mot de passe (8 caractères minimum).":"Connectez-vous avec l'adresse e-mail que Steven a enregistrée."}</p>
   ${pw?"":`<label>E-mail<input type="email" name="email" autocomplete="username" required></label>`}
   <label>${pw?"Nouveau mot de passe":"Mot de passe"}<input type="password" name="pw" autocomplete="${pw?"new-password":"current-password"}" minlength="8" required></label>
   <button type="submit">${pw?"Enregistrer et entrer":"Se connecter"}</button>
   ${pw?"":`<button type="button" class="link" data-lien>Première connexion ou mot de passe oublié</button>`}
   <div class="msg" role="status">${note||""}</div></form>`;
  document.body.appendChild(g);
  const f=g.querySelector("form"),msg=g.querySelector(".msg"),say=(t,ok)=>{msg.textContent=t;msg.className="msg"+(ok?" ok":"")};
  f.querySelector("input").focus();
  g.querySelector("[data-lien]")?.addEventListener("click",async()=>{
    const email=f.email.value.trim();if(!email){say("Indiquez d'abord votre e-mail.");return}
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    say(error?"Envoi impossible pour le moment, réessayez plus tard.":"Si cette adresse est enregistrée, un lien vient de partir. Ouvrez-le sur cet appareil.",!error);
  });
  f.addEventListener("submit",async e=>{
    e.preventDefault();const p=f.pw.value;
    if(p.length<8){say("8 caractères minimum.");return}
    if(pw){const {error}=await sb.auth.updateUser({password:p});if(error){say("Mot de passe refusé : "+(error.message||"réessayez."));return}g.remove();start();return}
    const {data,error}=await sb.auth.signInWithPassword({email:f.email.value.trim(),password:p});
    if(error){say("E-mail ou mot de passe incorrect.");return}
    session=data.session;g.remove();start();
  });
}

async function start(){
  const {data}=await sb.from("profils").select("id,email,nom,role").eq("id",session.user.id).maybeSingle();
  profil=data||{id:session.user.id,email:session.user.email,role:"lecteur"};
  const w=document.createElement("div");w.className="who";
  w.innerHTML=`<span>${(profil.nom||profil.email||"").replace(/[<>&]/g,"")}${profil.role==="editeur"?"":" · consultation"}</span><button type="button">Déconnexion</button>`;
  w.querySelector("button").onclick=async()=>{await sb.auth.signOut();location.reload()};
  document.body.appendChild(w);
  readyRes(true);
}

sb.auth.onAuthStateChange((ev,s)=>{if(ev==="PASSWORD_RECOVERY"){session=s;gate("setpw")}});
(async()=>{
  const {data}=await sb.auth.getSession();session=data.session;
  if(session&&fromLink)gate("setpw");
  else if(session)start();
  else gate("login");
})();

// ---------- base ----------
const isObj=v=>v&&typeof v==="object"&&!Array.isArray(v);
function merge(a,b){const o=isObj(a)?{...a}:{};for(const[k,v]of Object.entries(b))o[k]=isObj(v)&&isObj(o[k])?merge(o[k],v):v;return o}
function docRef(path){
  const id=path.split("/")[1];
  return{
    async update(patch){
      if(profil.role!=="editeur")throw err("invalid_argument");
      for(let n=0;n<6;n++){
        const {data:row,error:e1}=await sb.from("chantiers").select("data,version").eq("id",id).single();
        if(e1)throw err("unavailable",e1.message);
        const {data:upd,error:e2}=await sb.from("chantiers").update({data:merge(row.data,patch)}).eq("id",id).eq("version",row.version).select("id");
        if(e2)throw err(/size|too large/i.test(e2.message)?"quota_exceeded":"unavailable",e2.message);
        if(upd&&upd.length)return;
        // quelqu'un a écrit entre-temps : on relit et on refusionne
      }
      throw err("unavailable","conflit");
    },
    async set(doc){
      if(profil.role!=="editeur")throw err("invalid_argument");
      const {error}=await sb.from("chantiers").insert({id,data:doc});
      if(error)throw err("unavailable",error.message);
    }
  };
}
const db={
  doc:docRef,
  collection(){return{onSnapshot(cb,onErr){
    const rows=new Map();
    const emit=()=>cb({docs:[...rows].map(([id,d])=>({id,data:()=>d}))});
    let ch;
    (async()=>{
      const {data,error}=await sb.from("chantiers").select("id,data");
      if(error){onErr&&onErr(error);return}
      data.forEach(r=>rows.set(r.id,r.data));emit();
      ch=sb.channel("chantiers").on("postgres_changes",{event:"*",schema:"public",table:"chantiers"},p=>{
        if(p.eventType==="DELETE")rows.delete(p.old.id);else rows.set(p.new.id,p.new.data);emit();
      }).subscribe();
    })();
    // au retour sur l'onglet (téléphone en veille), on recharge tout au cas où le temps réel aurait décroché
    document.addEventListener("visibilitychange",async()=>{
      if(document.hidden)return;
      const {data}=await sb.from("chantiers").select("id,data");
      if(data){rows.clear();data.forEach(r=>rows.set(r.id,r.data));emit()}
    });
    return()=>ch&&sb.removeChannel(ch);
  }}}
};

// ---------- utilisateur ----------
const user={
  id:async()=>session.user.id,
  can:async cap=>cap==="data.write"?profil.role==="editeur":true,
  async profiles(ids){
    const {data}=await sb.from("profils").select("id,nom,email").in("id",ids);
    return Object.fromEntries((data||[]).map(p=>[p.id,{name:p.nom||(p.email||"").split("@")[0]}]));
  }
};

// ---------- documents ----------
const assets={
  async upload(f,{type}={}){
    if(f.size>20*1024*1024)throw err("too_large");
    const safe=f.name.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^\w.-]+/g,"_").slice(-80);
    const rid=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,10);
    const path=`app/${rid}-${safe}`;
    const {error}=await sb.storage.from(BUCKET).upload(path,f,{contentType:type||f.type||"application/octet-stream",upsert:false});
    if(error)throw err(/quota|exceed/i.test(error.message)?"quota_or_state":"failed",error.message);
    return{id:path,sizeBytes:f.size};
  }
};
// l'appli lit un document par fetch("/_blob/<id>") : on le sert depuis le stockage Supabase
const nativeFetch=window.fetch.bind(window);
window.fetch=async(u,o)=>{
  if(typeof u==="string"&&u.startsWith("/_blob/")){
    const {data,error}=await sb.storage.from(BUCKET).download(decodeURIComponent(u.slice(7)));
    return error?new Response(null,{status:404}):new Response(data,{status:200,headers:{"Content-Type":data.type||""}});
  }
  return nativeFetch(u,o);
};

const downloads={
  async save({filename,data}){
    const a=document.createElement("a");a.href=URL.createObjectURL(data);a.download=filename;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
  }
};

const services={db,user,assets,downloads};
window.claude={use:async name=>{await ready;return services[name]||null}};
})();
