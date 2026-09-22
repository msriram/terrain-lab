#!/bin/sh
# Install a login service that waits for Terrain Lab's Connect Kinect button.
set -eu

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
agent_path="$HOME/Library/LaunchAgents/com.msriram.terrain-lab-kinect.plist"
log_dir="$HOME/Library/Logs/TerrainLab"
mkdir -p "$(dirname "$agent_path")" "$log_dir"

cat > "$agent_path" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.msriram.terrain-lab-kinect</string>
  <key>ProgramArguments</key><array>
    <string>/bin/sh</string><string>${project_dir}/scripts/run.sh</string>
  </array>
  <key>EnvironmentVariables</key><dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>PORT</key><string>8090</string>
    <key>BRIDGE_IDLE</key><string>1</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${log_dir}/bridge.log</string>
  <key>StandardErrorPath</key><string>${log_dir}/bridge-error.log</string>
</dict></plist>
PLIST

launchctl bootout "gui/$(id -u)" "$agent_path" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$agent_path"
echo "Terrain Lab Kinect service installed. Open https://msriram.github.io/terrain-lab/ and press Connect Kinect."
