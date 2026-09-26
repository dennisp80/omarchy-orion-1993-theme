#!/bin/bash
# Installs the Orion 1993 screensaver, the optional part of the theme.
# Omarchy does not let a theme run code by itself, so this is a separate, opt-in step.
# Undo everything with ./uninstall.sh.
#
#   ./install.sh      explain and ask first
#   ./install.sh -y   no questions

set -e
HERE=$(cd "$(dirname "$0")" && pwd)
DATA=~/.local/share/orion-1993
ENV=~/.config/uwsm/env
HOOK=~/.config/omarchy/hooks/theme-set.d/orion-1993-screensaver.sh
BRANDING=~/.config/omarchy/branding/screensaver.txt
MARK="# orion-1993 screensaver (remove with the theme's screensaver/uninstall.sh)"

cat <<EOF
Orion 1993 screensaver: this will

  1. copy a small wrapper to        $DATA/bin/omarchy-screensaver
     It runs only while the orion-1993 theme is active; with any other theme it hands
     straight over to Omarchy's own screensaver.
  2. put that folder first on PATH  in $ENV  (takes effect at next login)
  3. add a theme-set hook           $HOOK
     It switches the screensaver text to the ORION emblem for this theme and back again.
  4. back up your current screensaver text to $DATA/screensaver.txt.orig

The screensaver itself is a web page shown in a kiosk window of Chromium, Chrome or Brave.
Esc, any key or moving the mouse ends it.

EOF

if ! command -v chromium >/dev/null && ! command -v google-chrome-stable >/dev/null && ! command -v brave >/dev/null; then
  echo "Note: no Chromium, Chrome or Brave found. The screensaver will fall back to Omarchy's"
  echo "text effects in the theme's colors until one is installed (omarchy pkg add chromium)."
  echo
fi

if [[ $1 != "-y" ]]; then
  if command -v gum >/dev/null; then
    gum confirm "Install the Orion 1993 screensaver?" || exit 1
  else
    read -rp "Install the Orion 1993 screensaver? [y/N] " a
    [[ $a == [yY]* ]] || exit 1
  fi
fi

install -D -m 755 "$HERE/bin/omarchy-screensaver" "$DATA/bin/omarchy-screensaver"

if [[ -f $BRANDING && ! -f $DATA/screensaver.txt.orig ]]; then
  cp "$BRANDING" "$DATA/screensaver.txt.orig"
fi

mkdir -p "$(dirname "$ENV")"
touch "$ENV"
if ! grep -qF "$MARK" "$ENV"; then
  printf '\n%s\nexport PATH="$HOME/.local/share/orion-1993/bin:$PATH"\n' "$MARK" >>"$ENV"
fi

install -D -m 755 "$HERE/theme-set-hook.sh" "$HOOK"

# already on the theme: switch the text now instead of at the next theme change
current=$(cat ~/.local/state/omarchy/current/theme.name 2>/dev/null || true)
bash "$HOOK" "$current"

echo
echo "Done. Log out and back in once, so the session picks up the new PATH."
echo "Then try it with:  omarchy-launch-screensaver force"
