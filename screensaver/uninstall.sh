#!/bin/bash
# Removes everything screensaver/install.sh added, and puts your screensaver text back.
# The theme itself stays installed (remove it with: omarchy theme remove orion-1993).

DATA=~/.local/share/orion-1993
ENV=~/.config/uwsm/env
HOOK=~/.config/omarchy/hooks/theme-set.d/orion-1993-screensaver.sh
BRANDING=~/.config/omarchy/branding/screensaver.txt
MARK="# orion-1993 screensaver (remove with the theme's screensaver/uninstall.sh)"
HERE=$(cd "$(dirname "$0")" && pwd)
HYPR_LUA=~/.config/hypr/hyprland.lua
LUA_BEGIN="-- >>> orion-1993 screensaver (remove with the theme's screensaver/uninstall.sh) >>>"
LUA_END="-- <<< orion-1993 screensaver <<<"

# the screensaver text: back to what it was before install.sh, if it is still the emblem
if [[ -f $HERE/orion.txt ]] && cmp -s "$BRANDING" "$HERE/orion.txt"; then
  if [[ -f $DATA/screensaver.txt.orig ]]; then
    cp "$DATA/screensaver.txt.orig" "$BRANDING"
  else
    cp "${OMARCHY_PATH:-/usr/share/omarchy}/logo.txt" "$BRANDING"
  fi
fi

# the PATH line: the marker line and the export right after it
if [[ -f $ENV ]] && grep -qF "$MARK" "$ENV"; then
  # (the blank line install.sh put before the marker goes too)
  awk -v m="$MARK" '
    $0 == "" { blank++; next }
    $0 == m { blank = 0; skip = 1; next }
    skip && /orion-1993\/bin/ { skip = 0; next }
    { for (; blank > 0; blank--) print ""; skip = 0; print }
    END { for (; blank > 0; blank--) print "" }' "$ENV" >"$ENV.tmp" &&
    mv "$ENV.tmp" "$ENV"
fi

# the Hyprland PATH block in hyprland.lua
if [[ -f $HYPR_LUA ]] && grep -qF -e "$LUA_BEGIN" "$HYPR_LUA"; then
  # drop the block and the blank line install.sh put before it
  awk -v b="$LUA_BEGIN" -v e="$LUA_END" '
    skip { if ($0 == e) skip = 0; next }
    $0 == b { if (have && held == "") have = 0; skip = 1; next }
    { if (have) print held; held = $0; have = 1 }
    END { if (have) print held }' "$HYPR_LUA" >"$HYPR_LUA.tmp" && mv "$HYPR_LUA.tmp" "$HYPR_LUA"
fi
command -v hyprctl >/dev/null && hyprctl reload >/dev/null 2>&1 || true

rm -f "$HOOK"
rm -rf "$DATA" ~/.cache/orion-1993-screensaver

echo "Orion 1993 screensaver removed. Log out and back in once to drop it from the session PATH."
