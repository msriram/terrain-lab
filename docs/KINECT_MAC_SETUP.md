# Kinect setup on Apple-silicon macOS

## Detected hardware

This machine currently reports all three interfaces expected from a powered
Kinect v1 / Xbox 360 sensor:

- Xbox NUI Camera
- Xbox NUI Motor
- Xbox Kinect Audio

Run the check again at any time:

```bash
./scripts/check-kinect.sh
```

## What FreenectTD installed

FreenectTD installs an Apple-silicon TouchDesigner plugin at:

```text
~/Library/Application Support/Derivative/TouchDesigner099/Plugins/FreenectTOP.plugin
```

It bundles Kinect access for TouchDesigner. It does **not** install a
system-wide DuneBox driver, and the current browser prototype does not yet read
the Kinect.

## Verify the sensor in TouchDesigner

1. Install TouchDesigner 2025 or later for Apple silicon.
2. Keep the Kinect power brick connected and connect its USB lead directly to
   the Mac where possible. Avoid an unpowered hub.
3. Launch TouchDesigner after connecting the Kinect.
4. Open the OP Create dialog and select **Custom > FreenectTOP**.
5. Confirm the default RGB output appears.
6. Add a **Render Select TOP** and choose output index `1` to inspect depth.
7. Use a depth range around 500–2000 mm for an overhead sandbox test.

Only one application can control the Kinect at a time. Close TouchDesigner
before testing another Kinect application.

## Optional standalone Kinect v1 diagnostic

FreenectTD contains its Kinect libraries inside the plugin, but does not expose
the normal `freenect-glview` command. For independent hardware testing, install
OpenKinect's tools:

```bash
brew install libfreenect
freenect-glview
```

This installation is optional and is separate from the FreenectTD plugin.

## Connecting it to DuneBox

DuneBox's Windows Kinect v2 backend cannot use FreenectTD directly. For this
Kinect v1, the macOS port should use openFrameworks' `ofxKinect`, backed by
libfreenect. The implementation order is:

1. Build DuneBox on macOS in its no-Kinect mode.
2. Build and run the standard openFrameworks `ofxKinect` example.
3. Enable DuneBox's existing Kinect v1 path (`kinectVersion=1`).
4. Validate 640×480 depth capture and world-coordinate conversion.
5. Perform projector/sandbox calibration.

The Kinect and FreenectTD installation are currently healthy enough to proceed
with the macOS DuneBox port.

## Troubleshooting

- If no NUI interfaces appear, verify the Kinect power supply's indicator and
  reconnect the USB adapter.
- If TouchDesigner cannot open the camera, quit other Kinect applications and
  reconnect the sensor before restarting TouchDesigner.
- If macOS blocks the plugin, use **System Settings > Privacy & Security > Open
  Anyway**, then relaunch TouchDesigner.
- On macOS 26, prefer a direct USB connection because USB hubs can complicate
  libusb device claiming and bandwidth.

