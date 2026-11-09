#!/bin/bash
# Installe la sauvegarde automatique de l'appli Chantiers MGDS sur ce Mac (chaque lundi à 7 h 30).
# À ouvrir sur le Mac du bureau : clic droit > Ouvrir. Le fichier sauvegarde.py doit être dans le même dossier que celui-ci.
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/MGDS"
PLIST="$HOME/Library/LaunchAgents/fr.mgds.sauvegarde.plist"
echo "=== Sauvegarde automatique de l'appli Chantiers MGDS ==="
echo
if [ ! -f "$ICI/sauvegarde.py" ]; then echo "Le fichier sauvegarde.py doit être à côté de celui-ci (même dossier)."; read -r -p "Entrée pour fermer"; exit 1; fi
if ! /usr/bin/python3 -c "import ssl" 2>/dev/null; then
  echo "Python 3 n'est pas encore installé sur ce Mac : macOS va proposer de l'installer (« Outils de ligne de commande »)."
  echo "Acceptez, attendez la fin, puis relancez ce fichier."
  /usr/bin/python3 --version || true; read -r -p "Entrée pour fermer"; exit 1
fi
echo "1) Faites glisser ici le dossier « Sauvegardes » du serveur (ex. CLIENTS/0. APPLI CHANTIERS/Sauvegardes), puis Entrée :"
read -r DOSSIER
DOSSIER="$(printf '%s' "$DOSSIER" | sed -e 's/[[:space:]]*$//' -e "s/^'//" -e "s/'$//" -e 's/\\\(.\)/\1/g')"  # le Terminal ajoute des \ devant les espaces
if [ ! -d "$DOSSIER" ]; then echo "Dossier introuvable : $DOSSIER"; read -r -p "Entrée pour fermer"; exit 1; fi
echo
echo "2) Tapez le mot de passe du compte sauvegarde@mgds.fr (donné par Claude ; rien ne s'affiche quand vous tapez), puis Entrée :"
read -r -s MDP; echo
umask 077
printf '%s\n%s\n' "sauvegarde@mgds.fr" "$MDP" > "$HOME/.mgds-sauvegarde"
chmod 600 "$HOME/.mgds-sauvegarde"
mkdir -p "$DEST" "$HOME/Library/LaunchAgents"
cp "$ICI/sauvegarde.py" "$DEST/sauvegarde.py"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>fr.mgds.sauvegarde</string>
  <key>ProgramArguments</key><array>
    <string>/usr/bin/python3</string><string>$DEST/sauvegarde.py</string><string>$DOSSIER</string>
  </array>
  <key>StartCalendarInterval</key><dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>7</integer><key>Minute</key><integer>30</integer></dict>
  <key>StandardOutPath</key><string>$DEST/derniere-execution.txt</string>
  <key>StandardErrorPath</key><string>$DEST/derniere-execution.txt</string>
</dict></plist>
EOF
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo
echo "3) Première sauvegarde maintenant (la première fois, tous les fichiers sont copiés : cela peut prendre plusieurs minutes)…"
echo
if /usr/bin/python3 "$DEST/sauvegarde.py" "$DOSSIER"; then
  echo; echo "Terminé : la sauvegarde se refera toute seule chaque lundi à 7 h 30 (Mac allumé, serveur branché)."
else
  echo; echo "La sauvegarde a rencontré un problème : envoyez une capture de cette fenêtre à Claude."
fi
echo "Résultat de la dernière sauvegarde : fichier DERNIERE-SAUVEGARDE.txt dans le dossier Sauvegardes."
read -r -p "Entrée pour fermer"
