#!/bin/bash
# Orion 1993: the ORION emblem as the screensaver text while the theme is active (used by the
# text fallback), Omarchy's own logo otherwise. Installed by the theme's screensaver/install.sh.
THEME=orion-1993
THEME_DIR=$(omarchy-theme-dir "$THEME" 2>/dev/null) || THEME_DIR=~/.config/omarchy/themes/$THEME
ART=$THEME_DIR/screensaver/orion.txt
DEST=~/.config/omarchy/branding/screensaver.txt

if [[ $1 == "$THEME" && -f $ART ]]; then
  cp "$ART" "$DEST"
elif [[ -f $ART ]] && cmp -s "$DEST" "$ART"; then
  # back to what was there before install.sh (a custom text, if the user had one)
  ORIG=~/.local/share/orion-1993/screensaver.txt.orig
  [[ -f $ORIG ]] || ORIG=${OMARCHY_PATH:-/usr/share/omarchy}/logo.txt
  cp "$ORIG" "$DEST"
fi
