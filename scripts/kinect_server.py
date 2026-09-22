#!/usr/bin/env python3
"""Local static server plus a live Kinect-v1 depth endpoint."""

import argparse
import json
import os
import pathlib
import struct
import subprocess
import threading
import time
from urllib.parse import urlsplit
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

WIDTH = 640
HEIGHT = 480
PAYLOAD_SIZE = WIDTH * HEIGHT * 2
FRAME_SIZE = 12 + PAYLOAD_SIZE


class DepthReader:
    def __init__(self, bridge):
        self.bridge = bridge
        self.process = None
        self.frame = None
        self.frame_number = None
        self.timestamp = None
        self.error = "Starting Kinect bridge"
        self.lock = threading.Lock()

    def start(self):
        thread = threading.Thread(target=self._run, daemon=True)
        thread.start()

    def _read_exact(self, stream, count):
        chunks = bytearray()
        while len(chunks) < count:
            chunk = stream.read(count - len(chunks))
            if not chunk:
                return None
            chunks.extend(chunk)
        return bytes(chunks)

    def _run(self):
        try:
            self.process = subprocess.Popen(
                [str(self.bridge)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=0,
            )
            stderr_thread = threading.Thread(target=self._read_stderr, daemon=True)
            stderr_thread.start()
            while True:
                packet = self._read_exact(self.process.stdout, FRAME_SIZE)
                if packet is None:
                    code = self.process.wait()
                    with self.lock:
                        if not self.error or self.error == "Starting Kinect bridge":
                            self.error = f"Kinect bridge stopped (exit {code})"
                    return
                if packet[:4] != b"KDEP":
                    with self.lock:
                        self.error = "Invalid Kinect frame stream"
                    return
                frame_number, timestamp = struct.unpack_from("<II", packet, 4)
                with self.lock:
                    self.frame = packet[12:]
                    self.frame_number = frame_number
                    self.timestamp = timestamp
                    self.error = None
        except Exception as exc:
            with self.lock:
                self.error = str(exc)

    def _read_stderr(self):
        for raw_line in iter(self.process.stderr.readline, b""):
            message = raw_line.decode("utf-8", "replace").strip()
            if message:
                print(f"[Kinect] {message}")
                if "Unable" in message:
                    with self.lock:
                        self.error = message

    def snapshot(self):
        with self.lock:
            return self.frame, self.frame_number, self.timestamp, self.error


def make_handler(depth_reader):
    class Handler(SimpleHTTPRequestHandler):
        def _send_api_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Cache-Control", "no-store")

        def do_OPTIONS(self):
            self.send_response(HTTPStatus.NO_CONTENT)
            self._send_api_headers()
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.end_headers()

        def do_GET(self):
            request_path = urlsplit(self.path).path
            if request_path == "/api/status":
                frame, number, timestamp, error = depth_reader.snapshot()
                body = json.dumps({
                    "connected": frame is not None and error is None,
                    "frame": number,
                    "timestamp": timestamp,
                    "error": error,
                    "width": WIDTH,
                    "height": HEIGHT,
                }).encode()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "application/json")
                self._send_api_headers()
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if request_path == "/api/depth":
                frame, number, timestamp, error = depth_reader.snapshot()
                if frame is None:
                    body = json.dumps({"error": error or "No depth frame yet"}).encode()
                    self.send_response(HTTPStatus.SERVICE_UNAVAILABLE)
                    self.send_header("Content-Type", "application/json")
                    self._send_api_headers()
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
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
    args = parser.parse_args()

    root = pathlib.Path(__file__).resolve().parent.parent
    os.chdir(root)
    reader = DepthReader(args.bridge)
    reader.start()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(reader))
    print(f"Portable Magic Sand: http://localhost:{args.port}")
    print("Kinect live mode enabled. Close TouchDesigner if the sensor is busy.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if reader.process and reader.process.poll() is None:
            reader.process.terminate()
        server.server_close()


if __name__ == "__main__":
    main()
