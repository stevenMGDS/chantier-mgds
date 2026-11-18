#!/bin/bash
# Installe la synchronisation automatique serveur <-> appli Chantiers sur ce Mac : toutes les 30 minutes, du lundi au
# vendredi de 7 h à 20 h, sans passer par Claude. À ouvrir sur l'iMac du bureau : clic droit > Ouvrir.
# Les fichiers agent_synchro.py et atelier_sync.py doivent être dans le même dossier que celui-ci.
# La veille atelier (dossiers ATELIER -> onglet Atelier) se fait aussi sur ce Mac, une fois par heure, si le mot de passe
# du compte de l'iMac (claude@mgds.fr) est donné à l'étape 2.
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/MGDS"
PLIST="$HOME/Library/LaunchAgents/fr.mgds.synchro.plist"
echo "=== Synchronisation automatique serveur <-> appli Chantiers ==="
echo
if [ ! -f "$ICI/agent_synchro.py" ]; then echo "Le fichier agent_synchro.py doit être à côté de celui-ci (même dossier)."; read -r -p "Entrée pour fermer"; exit 1; fi
if ! /usr/bin/python3 -c "import ssl" 2>/dev/null; then
  echo "Python 3 n'est pas encore installé : macOS va proposer de l'installer (« Outils de ligne de commande »). Acceptez, puis relancez ce fichier."
  /usr/bin/python3 --version || true; read -r -p "Entrée pour fermer"; exit 1
fi
MGDS="/Volumes/Public/MGDS"
if [ ! -d "$MGDS/COMMUN" ]; then
  echo "1) Le dossier MGDS du serveur n'est pas à l'endroit habituel. Faites glisser ici le dossier MGDS du serveur, puis Entrée :"
  read -r MGDS
  MGDS="$(printf '%s' "$MGDS" | sed -e 's/[[:space:]]*$//' -e "s/^'//" -e "s/'$//" -e 's/\\\(.\)/\1/g')"
fi
PROG="$MGDS/COMMUN/_PROCESS CLAUDE/outil/sync_serveur.py"
if [ ! -f "$PROG" ]; then echo "Programme de synchronisation introuvable : $PROG"; read -r -p "Entrée pour fermer"; exit 1; fi
PRIVE="$HOME/Documents/Claude privé"
# le programme du serveur a été écrit pour les chemins ~/mnt/MGDS et ~/mnt/Claude privé : on les crée en raccourcis
mkdir -p "$HOME/mnt"
[ -e "$HOME/mnt/MGDS" ] || ln -s "$MGDS" "$HOME/mnt/MGDS"
if [ -d "$PRIVE" ] && [ ! -e "$HOME/mnt/Claude privé" ]; then ln -s "$PRIVE" "$HOME/mnt/Claude privé"; fi
mkdir -p "$DEST" "$HOME/Library/LaunchAgents"
cp "$ICI/agent_synchro.py" "$DEST/agent_synchro.py"
[ -f "$ICI/atelier_sync.py" ] && cp "$ICI/atelier_sync.py" "$DEST/atelier_sync.py"
echo
echo "2) Veille de l'atelier sur ce Mac : tapez le mot de passe du compte claude@mgds.fr (celui que la synchronisation utilise déjà ;"
echo "   rien ne s'affiche quand vous tapez), puis Entrée. Laissez vide et Entrée pour ne pas l'installer maintenant."
read -r -s MDP; echo
if [ -n "$MDP" ]; then umask 077; printf '%s\n%s\n' "claude@mgds.fr" "$MDP" > "$HOME/.mgds-atelier"; chmod 600 "$HOME/.mgds-atelier"; echo "   Compte enregistré pour la veille de l'atelier."; fi
MDP=""
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>fr.mgds.synchro</string>
  <key>ProgramArguments</key><array>
    <string>/usr/bin/python3</string><string>-I</string><string>$DEST/agent_synchro.py</string><string>$MGDS</string>
  </array>
  <key>StartInterval</key><integer>1800</integer>
  <key>StandardOutPath</key><string>$DEST/synchro-launchd.txt</string>
  <key>StandardErrorPath</key><string>$DEST/synchro-launchd.txt</string>
</dict></plist>
EOF
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo
echo "3) Premier passage maintenant (une à trois minutes). Si macOS demande l'accès aux dossiers ou au serveur, cliquez « Autoriser »."
echo
/usr/bin/python3 -I "$DEST/agent_synchro.py" "$MGDS" --maintenant || true
echo
echo "----- Résultat du premier passage -----"
tail -n 25 "$DEST/synchro.log" 2>/dev/null || echo "(pas de journal)"
echo "---------------------------------------"
echo
echo "Si vous voyez « tout : code 0 » (et « veille atelier : faite »), c'est en place : la synchronisation se refera toute seule"
echo "toutes les 30 minutes, et la veille de l'atelier toutes les heures."
echo "Sinon, faites une capture de cette fenêtre et envoyez-la à Claude."
read -r -p "Entrée pour fermer"
