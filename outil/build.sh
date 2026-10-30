#!/bin/sh
# Fabrique index.html (version autonome, Supabase) à partir de l'appli claude.ai : ../appli/chantiers-mgds.html
# Usage : sh build.sh   → écrit index.html à côté de ce script
cd "$(dirname "$0")"
SRC=../appli/chantiers-mgds.html
{
cat <<'HEAD'
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#1F5F8B">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Chantiers">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
HEAD
grep -v 'name="claude:' "$SRC" | awk '
  /^<script src="https:\/\/cdnjs.cloudflare.com\/ajax\/libs\/pdf.js/ && !done {
    print "<script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js\"></script>"
    print "<script>"; while ((getline l < "shim.js") > 0) print l; print "</script>"; done=1 }
  { print }'
echo '</html>'
} > index.html
echo "index.html : $(wc -c < index.html) octets"
