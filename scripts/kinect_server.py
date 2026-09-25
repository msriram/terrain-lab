#!/usr/bin/env python3
"""Local, restartable Kinect-v1 depth bridge and static Terrain Lab server."""

import argparse
import json
import os
import pathlib
import select
import signal
import struct
import subprocess
import threading
import time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

WIDTH = 640
HEIGHT = 480
PAYLOAD_SIZE = WIDTH * HEIGHT * 2
FRAME_SIZE = 12 + PAYLOAD_SIZE


class DepthReader:
    """Owns the native process so the USB lock is always released cleanly."""

    def __init__(self, bridge, autostart=True):
        self.bridge = bridge
        self.process = None
        self.frame = None
        self.frame_number = None
        self.timestamp = None
        self.error = "Kinect is idle" if not autostart else "Starting Kinect bridge"
        self.capture_requested = autostart
        self.closed = False
        self.lock = threading.RLock()
        self.wake = threading.Event()
        self.thread = None

    def start(self):
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def connect(self):
        with self.lock:
            self.capture_requested = True
            self.frame = None
            self.error = "Starting Kinect bridge"
        self.wake.set()

    def disconnect(self):
        with self.lock:
            self.capture_requested = False
            self.frame = None
            self.error = "Kinect disconnected"
            process = self.process
        self._stop_process(process)
        self.wake.set()

    def close(self):
        with self.lock:
            self.closed = True
        self.disconnect()
        if self.thread:
            self.thread.join(timeout=3)

    @staticmethod
    def _stop_process(process):
        if not process or process.poll() is not None:
            return
        process.terminate()
        try:
            process.wait(timeout=1.5)
        except subprocess.TimeoutExpired:
            process.kill()
            try:
                process.wait(timeout=1.5)
            except subprocess.TimeoutExpired:
                pass

    @staticmethod
    def _read_exact(stream, count):
        chunks = bytearray()
        while len(chunks) < count:
            chunk = stream.read(count - len(chunks))
            if not chunk:
                return None
            chunks.extend(chunk)
        return bytes(chunks)

    def _read_stderr(self, process):
        for raw_line in iter(process.stderr.readline, b""):
            message = raw_line.decode("utf-8", "replace").strip()
            if message:
                print(f"[Kinect] {message}", flush=True)
                with self.lock:
                    if self.capture_requested:
                        self.error = message

    def _run(self):
        while True:
            with self.lock:
                if self.closed:
                    return
                requested = self.capture_requested
            if not requested:
                self.wake.wait(timeout=1)
                self.wake.clear()
                continue

            process = None
            try:
                process = subprocess.Popen(
                    [str(self.bridge)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0
                )
                with self.lock:
                    self.process = process
                    self.error = "Starting Kinect bridge"
                threading.Thread(target=self._read_stderr, args=(process,), daemon=True).start()

                awaiting_first_frame = True
                while True:
                    with self.lock:
                        active = self.capture_requested and not self.closed
                    if not active:
                        break
                    ready, _, _ = select.select([process.stdout], [], [], 8 if awaiting_first_frame else 4)
                    if not ready:
                        raise RuntimeError("Timed out waiting for Kinect depth frames; restarting capture")
                    packet = self._read_exact(process.stdout, FRAME_SIZE)
                    if packet is None:
                        raise RuntimeError(f"Kinect bridge stopped (exit {process.poll()})")
                    if packet[:4] != b"KDEP":
                        raise RuntimeError("Invalid Kinect frame stream")
                    frame_number, timestamp = struct.unpack_from("<II", packet, 4)
                    with self.lock:
                        if not self.capture_requested or self.closed:
                            break
                        self.frame = packet[12:]
                        self.frame_number = frame_number
                        self.timestamp = timestamp
                        self.error = None
                    awaiting_first_frame = False
            except Exception as exc:
                with self.lock:
                    if self.capture_requested and not self.closed:
                        self.frame = None
                        self.error = str(exc)
            finally:
                self._stop_process(process)
                with self.lock:
                    if self.process is process:
                        self.process = None
            with self.lock:
                retry = self.capture_requested and not self.closed
            if retry:
                time.sleep(1)

    def snapshot(self):
        with self.lock:
            return self.frame, self.frame_number, self.timestamp, self.error, self.capture_requested


def make_handler(depth_reader):
    class Handler(SimpleHTTPRequestHandler):
        def _send_api_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Cache-Control", "no-store")

        def _send_json(self, status, payload):
            body = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self._send_api_headers()
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            self.send_response(HTTPStatus.NO_CONTENT)
            self._send_api_headers()
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.end_headers()

        def do_POST(self):
            request_path = urlsplit(self.path).path
            if request_path == "/api/connect":
                depth_reader.connect()
                self._send_json(HTTPStatus.ACCEPTED, {"requested": True})
                return
            if request_path == "/api/disconnect":
                depth_reader.disconnect()
                self._send_json(HTTPStatus.OK, {"requested": False})
                return
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Unknown API endpoint"})

        def do_GET(self):
            request_path = urlsplit(self.path).path
            if request_path == "/api/status":
                frame, number, timestamp, error, requested = depth_reader.snapshot()
                self._send_json(HTTPStatus.OK, {
                    "connected": frame is not None and error is None,
                    "requested": requested,
                    "frame": number,
                    "timestamp": timestamp,
                    "error": error,
                    "width": WIDTH,
                    "height": HEIGHT,
                })
                return
            if request_path == "/api/depth":
                frame, number, timestamp, error, _ = depth_reader.snapshot()
                if frame is None:
                    self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": error or "No depth frame yet"})
                    return
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "application/octet-stream")
                self._send_api_headers()
                self.send_header("X-Depth-Width", str(WIDTH))
                self.send_header("X-Depth-Height", str(HEIGHT))
                self.send_header("X-Frame-Number", str(number))
                self.send_header("X-Kinect-Timestamp", str(timestamp))
                self.send_header("Content-Length", str(len(frame)))
                self.end_headers()
                self.wfile.write(frame)
                return
            super().do_GET()

        def log_message(self, fmt, *args):
            if not self.path.startswith("/api/"):
                super().log_message(fmt, *args)

    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--bridge", type=pathlib.Path, required=True)
    parser.add_argument("--idle", action="store_true", help="Wait for /api/connect before opening Kinect")
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parent.parent
    os.chdir(root)
    reader = DepthReader(args.bridge, autostart=not args.idle)
    reader.start()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(reader))

    def handle_stop(_signal, _frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, handle_stop)
    signal.signal(signal.SIGHUP, handle_stop)
    print(f"Terrain Lab sandbox: http://localhost:{args.port}/sandbox/", flush=True)
    print("Kinect capture is restartable; use /api/connect and /api/disconnect.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        reader.close()
        server.server_close()


if __name__ == "__main__":
    main()
