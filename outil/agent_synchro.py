"""Synchronisation serveur <-> appli Chantiers lancée par l'iMac lui-même (Steven, 18/11/2026), sans session Claude.

Lancé toutes les 30 minutes par macOS (launchd, fr.mgds.synchro, installé par installer-synchro.command) :
  /usr/bin/python3 -I agent_synchro.py <dossier MGDS du serveur>
Il ne fait rien le week-end, ni avant 7 h ou après 20 h, ni si le serveur n'est pas branché, ni si un passage précédent
tourne encore. Sinon il lance le programme de synchronisation déjà posé sur le serveur
(COMMUN/_PROCESS CLAUDE/outil/sync_serveur.py « tout », puis « lien »), exactement comme la tâche Claude le faisait.
Puis la veille atelier, si le compte de l'iMac a été donné à l'installation (~/.mgds-atelier) : liste des dossiers
ATELIER des chantiers, export, puis import dans l'appli avec atelier_sync.py (copié à côté de ce programme) ; une fois
par heure seulement. Les chemins passent par ~/mnt/MGDS, comme du temps de la tâche Claude, pour que les commandes
atelier déjà connues soient reconnues.
Journal : ~/Library/Application Support/MGDS/synchro.log (les 400 dernières lignes) ; état : synchro-etat.json.
Il n'efface rien et n'écrit rien d'autre.
"""
import datetime, json, os, subprocess, sys

DEST = os.path.expanduser("~/Library/Application Support/MGDS")
LOG, ETAT, VERROU = (os.path.join(DEST, n) for n in ("synchro.log", "synchro-etat.json", "synchro.verrou"))


def journal(lignes):
    os.makedirs(DEST, exist_ok=True)
    old = open(LOG, encoding="utf-8", errors="replace").read().splitlines() if os.path.exists(LOG) else []
    open(LOG, "w", encoding="utf-8").write("\n".join((old + lignes)[-400:]) + "\n")


def lancer(prog, arg, essais=2):
    for n in range(essais):
        try:
            # sans -I : le programme du serveur a besoin du module « requests », installé pour l'utilisateur (pip --user)
            r = subprocess.run(["/usr/bin/python3", prog, arg], cwd=os.path.expanduser("~"), capture_output=True, text=True, timeout=170)
            return r.returncode, (r.stdout + r.stderr).strip()
        except subprocess.TimeoutExpired:
            if n == essais - 1: return 124, "délai dépassé deux fois (le programme reprend où il s'est arrêté au passage suivant)"
    return 1, ""


def liste_atelier(racine):
    """comme la commande find de l'ancienne tâche : dossiers « atelier » (profondeur 4, sans Z.TERMINÉS) et leurs fichiers"""
    out, base = [], racine.rstrip("/")
    for chemin, dossiers, fichiers in os.walk(base):
        prof = chemin[len(base):].count(os.sep)
        dossiers[:] = [d for d in dossiers if not d.upper().startswith("Z.TERMIN") and not d.startswith(".")]
        if prof >= 4: dossiers[:] = []
        for d in list(dossiers):
            if "atelier" in d.lower():
                a = os.path.join(chemin, d); out.append("A|" + a)
                for c2, _, fs in os.walk(a):
                    for f in fs:
                        if f.startswith(".") or f.startswith("~$"): continue
                        p = os.path.join(c2, f)
                        try: st = os.stat(p)
                        except OSError: continue
                        out.append(f"F|{datetime.date.fromtimestamp(st.st_mtime).isoformat()}|{st.st_size}|{p}")
    return out


def veille_atelier(now):
    compte, outil = os.path.expanduser("~/.mgds-atelier"), os.path.join(DEST, "atelier_sync.py")
    if not (os.path.exists(compte) and os.path.exists(outil)): return []
    marque = os.path.join(DEST, "atelier-dernier.txt")
    if os.path.exists(marque) and now.timestamp() - os.path.getmtime(marque) < 3300 and "--maintenant" not in sys.argv: return []
    R = os.path.expanduser("~/mnt/MGDS/CLIENTS/3. CHANTIERS")
    liste, js = os.path.join(DEST, "atelier_liste.txt"), os.path.join(DEST, "atelier.json")
    open(liste, "w", encoding="utf-8").write("\n".join(liste_atelier(R)) + "\n")
    with open(js, "w", encoding="utf-8") as f:
        r = subprocess.run(["/usr/bin/python3", "-I", outil, "export", "--racine", R, "--liste", liste], stdout=f, stderr=subprocess.PIPE, text=True, timeout=300)
    if r.returncode: return [f"veille atelier : export en erreur {r.stderr.strip()[-300:]}"]
    r = subprocess.run(["/usr/bin/python3", "-I", outil, "import", js, "--compte", compte], capture_output=True, text=True, timeout=300)
    open(marque, "w").write(now.isoformat())
    return ["veille atelier : " + ("faite" if r.returncode == 0 else "ÉCHEC")] + (r.stdout + r.stderr).strip().splitlines()[-25:]


def main():
    racine = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/Public/MGDS"
    force = "--maintenant" in sys.argv
    now = datetime.datetime.now()
    if not force and (now.weekday() >= 5 or not 7 <= now.hour < 20): return
    prog = os.path.join(racine, "COMMUN", "_PROCESS CLAUDE", "outil", "sync_serveur.py")
    if not os.path.isfile(prog):
        journal([f"{now:%d/%m %H:%M} serveur non branché ou programme absent : {prog}"]); return
    if os.path.exists(VERROU) and (now.timestamp() - os.path.getmtime(VERROU)) < 1200: return
    os.makedirs(DEST, exist_ok=True); open(VERROU, "w").write(str(os.getpid()))
    try:
        code, out = lancer(prog, "tout")
        code2, out2 = lancer(prog, "lien", essais=1)
        try: atl = veille_atelier(now)
        except Exception as e: atl = [f"veille atelier : ÉCHEC {e}"]
        lignes = [f"===== {now:%d/%m/%Y %H:%M} · tout : code {code} · lien : code {code2}"] + out.splitlines()[-60:] + out2.splitlines()[-30:] + atl
        journal(lignes)
        alertes = [l for l in (out + "\n" + out2 + "\n" + "\n".join(atl)).splitlines() if any(m in l for m in ("ÉCHEC", "REFUSÉ", "SANS CHANTIER", "Traceback", "Error"))]
        json.dump({"le": now.isoformat(timespec="minutes"), "code": code, "code_lien": code2, "alertes": alertes[:20]},
                  open(ETAT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    finally:
        try: os.remove(VERROU)
        except OSError: pass


if __name__ == "__main__":
    main()
