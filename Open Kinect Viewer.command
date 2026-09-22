#!/bin/sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
viewer="$project_dir/touchdesigner/Kinect Viewer.toe"
plugin="$HOME/Library/Application Support/Derivative/TouchDesigner099/Plugins/FreenectTOP.plugin"
touchdesigner="/Applications/TouchDesigner.app"

if [ ! -d "$touchdesigner" ]; then
  printf '%s\n' "TouchDesigner was not found in /Applications." >&2
  printf '%s\n' "Install TouchDesigner 2025 or later, then run this file again." >&2
  printf '%s' "Press Return to close..."
  read answer
  exit 1
fi

if [ ! -d "$plugin" ]; then
  printf '%s\n' "FreenectTOP.plugin was not found." >&2
  printf '%s\n' "Reinstall FreenectTD, then run this file again." >&2
  printf '%s' "Press Return to close..."
  read answer
  exit 1
fi

if ! ioreg -p IOUSB -l -w 0 2>/dev/null | grep -q "Xbox NUI Camera"; then
  printf '%s\n' "The Kinect v1 camera is not visible over USB." >&2
  printf '%s\n' "Check its power and USB adapter before continuing." >&2
  printf '%s' "Press Return to close, or type open to launch anyway: "
  read answer
  [ "$answer" = "open" ] || exit 1
fi

open -a "$touchdesigner" "$viewer"

