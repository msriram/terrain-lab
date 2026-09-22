#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

if command -v python3 >/dev/null 2>&1; then
  port="${PORT:-8080}"

  # When PORT is not explicitly set, find the first free local port. This
  # makes repeated launches and machines with an existing dev server painless.
  if [ -z "${PORT+x}" ]; then
    while ! python3 -c 'import socket, sys
s = socket.socket()
try:
    s.bind(("127.0.0.1", int(sys.argv[1])))
except OSError:
    raise SystemExit(1)
finally:
    s.close()' "$port"; do
      port=$((port + 1))
      if [ "$port" -gt 8099 ]; then
        echo "No free local port found between 8080 and 8099." >&2
        exit 1
      fi
    done
  fi

  bridge="build/kinect_depth_bridge"
  source="native/kinect_depth_bridge.c"
  freenect_prefix="$(brew --prefix libfreenect 2>/dev/null || true)"
  if [ -n "$freenect_prefix" ]; then
    if [ ! -x "$bridge" ] || [ "$source" -nt "$bridge" ]; then
      mkdir -p build
      echo "Building Kinect depth bridge..."
      cc -std=c11 -O2 -Wall -Wextra \
        -I"$freenect_prefix/include/libfreenect" \
        -I"$(brew --prefix libusb)/include/libusb-1.0" \
        "$source" \
        -L"$freenect_prefix/lib" -L"$(brew --prefix libusb)/lib" \
        -lfreenect_sync -lfreenect -lusb-1.0 \
        -o "$bridge"
    fi
  else
    echo "libfreenect is missing; install it with: brew install libfreenect" >&2
    exit 1
  fi

  exec python3 scripts/kinect_server.py --port "$port" --bridge "$bridge"
fi

echo "Python 3 was not found. Open index.html directly in a modern browser." >&2
exit 1
