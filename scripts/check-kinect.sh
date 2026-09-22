#!/usr/bin/env sh
set -eu

usb="$(ioreg -p IOUSB -l -w 0 2>/dev/null || true)"
plugin="$HOME/Library/Application Support/Derivative/TouchDesigner099/Plugins/FreenectTOP.plugin"

echo "Kinect hardware"
if printf '%s' "$usb" | grep -q "Xbox NUI Camera"; then
  echo "  ✓ Kinect v1 / Xbox 360 detected"
  printf '%s' "$usb" | grep -q "Xbox NUI Motor" && echo "  ✓ Motor interface detected"
  printf '%s' "$usb" | grep -q "Xbox Kinect Audio" && echo "  ✓ Audio interface detected"
elif printf '%s' "$usb" | grep -qiE "Xbox.*Kinect|Kinect.*Camera|idProduct.*02d[89]"; then
  echo "  ✓ Kinect-compatible USB device detected (likely Kinect v2)"
else
  echo "  ✗ No Kinect camera detected"
  echo "    Check the powered Kinect adapter, USB cable, and USB hub/adapter."
fi

echo
echo "FreenectTD"
if [ -d "$plugin" ]; then
  echo "  ✓ Plugin installed"
  binary="$plugin/Contents/MacOS/FreenectTOP"
  if [ -f "$binary" ]; then
    arch="$(file "$binary" 2>/dev/null || true)"
    case "$arch" in
      *arm64*) echo "  ✓ Apple-silicon binary" ;;
      *) echo "  ! Plugin is not identified as an Apple-silicon binary" ;;
    esac
  fi
else
  echo "  ✗ Plugin not found at:"
  echo "    $plugin"
fi

echo
echo "System driver tools"
if command -v freenect-glview >/dev/null 2>&1; then
  echo "  ✓ freenect-glview available: $(command -v freenect-glview)"
else
  echo "  - Homebrew libfreenect tools are not installed (optional for diagnostics)"
fi

echo
echo "Next step"
echo "  See docs/KINECT_MAC_SETUP.md"

