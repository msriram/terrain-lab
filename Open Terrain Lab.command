#!/bin/sh
# Double-click this file on macOS to start the local bridge and open Terrain Lab.
cd "$(dirname "$0")" || exit 1
PORT=8090 ./scripts/run.sh &
bridge_pid=$!

# Give the local service a moment to bind before the hosted interface scans it.
sleep 1
open "https://msriram.github.io/terrain-lab/?autoconnect=1"
wait "$bridge_pid"
