"""Synchronisation serveur <-> appli Chantiers lancée par l'iMac lui-même (Steven, 18/11/2026), sans session Claude.

Lancé toutes les 30 minutes par macOS (launchd, fr.mgds.synchro, installé par installer-synchro.command) :
  /usr/bin/python3 -I agent_synchro.py <dossier MGDS du serveur>
Il ne fait rien le week-end, ni avant 7 h ou après 20 h, ni si le serveur n'est pas branché, ni si un passage précédent
tourne encore. Sinon il lance le programme de synchronisation déjà posé sur le serveur
(COMMUN/_PROCESS CLAUDE/outil/sync_serveur.py « tout », puis « lien »), exactement comme la tâche Claude le faisait.
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
            r = subprocess.run(["/usr/bin/python3", "-I", prog, arg], cwd=os.path.expanduser("~"), capture_output=True, text=True, timeout=170)
            return r.returncode, (r.stdout + r.stderr).strip()
        except subprocess.TimeoutExpired:
            if n == essais - 1: return 124, "délai dépassé deux fois (le programme reprend où il s'est arrêté au passage suivant)"
    return 1, ""


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
        lignes = [f"===== {now:%d/%m/%Y %H:%M} · tout : code {code} · lien : code {code2}"] + out.splitlines()[-60:] + out2.splitlines()[-30:]
        journal(lignes)
        alertes = [l for l in (out + "\n" + out2).splitlines() if any(m in l for m in ("ÉCHEC", "REFUSÉ", "SANS CHANTIER", "Traceback", "Error"))]
        json.dump({"le": now.isoformat(timespec="minutes"), "code": code, "code_lien": code2, "alertes": alertes[:20]},
                  open(ETAT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    finally:
        try: os.remove(VERROU)
        except OSError: pass


if __name__ == "__main__":
    main()
