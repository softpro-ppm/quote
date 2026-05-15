#!/usr/bin/env python3
"""
Serve this folder as static files and proxy /api/* to the Render backend
so the built app works on localhost without CORS issues.
"""
from __future__ import annotations

import errno
import os
import sys
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
UPSTREAM = os.environ.get("QUOTE_API_UPSTREAM", "https://quote-6qt6.onrender.com")

_STATIC_PREFIXES = ("/assets/", "/pwa/", "/brand/")
_STATIC_SUFFIXES = (
    ".js",
    ".css",
    ".map",
    ".json",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".webmanifest",
)


class ReuseAddrThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _url_path(self) -> str:
        p = (urlparse(self.path).path or "/").split("#", 1)[0]
        if len(p) > 1:
            p = p.rstrip("/") or "/"
        return p

    def _safe_file_path(self, url_path: str) -> Path | None:
        rel = url_path.lstrip("/")
        if not rel or rel.endswith("/"):
            if url_path in ("/", ""):
                return ROOT / "index.html"
            return None
        if ".." in rel.split("/"):
            return None
        p = (ROOT / rel).resolve()
        try:
            p.relative_to(ROOT.resolve())
        except ValueError:
            return None
        return p

    def _looks_like_static_asset(self, url_path: str) -> bool:
        low = url_path.lower()
        if any(url_path.startswith(p) for p in _STATIC_PREFIXES):
            return True
        return any(low.endswith(s) for s in _STATIC_SUFFIXES)

    def _serve_index_html(self) -> None:
        index = ROOT / "index.html"
        data = index.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def _proxy(self) -> None:
        path = self.path.split("#", 1)[0]
        target = UPSTREAM.rstrip("/") + path
        body = None
        cl = self.headers.get("Content-Length")
        if cl:
            body = self.rfile.read(int(cl))
        req = urllib.request.Request(target, data=body, method=self.command)
        for h in ("Authorization", "Content-Type", "Accept"):
            v = self.headers.get(h)
            if v:
                req.add_header(h, v)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    lk = k.lower()
                    if lk not in ("transfer-encoding", "connection"):
                        self.send_header(k, v)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            for k, v in e.headers.items():
                lk = k.lower()
                if lk not in ("transfer-encoding", "connection"):
                    self.send_header(k, v)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as ex:
            msg = str(ex).encode()
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

    def do_OPTIONS(self) -> None:
        if self.path.split("?", 1)[0].startswith("/api"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
            self.send_header(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            )
            self.send_header(
                "Access-Control-Allow-Headers",
                "Authorization, Content-Type, Accept",
            )
            self.send_header("Access-Control-Allow-Credentials", "true")
            self.send_header("Access-Control-Max-Age", "86400")
            self.end_headers()
        else:
            self.send_error(404)

    def do_GET(self) -> None:
        path = self._url_path()
        if path.startswith("/api"):
            self._proxy()
            return
        target = self._safe_file_path(path)
        if target is None:
            self.send_error(403)
            return
        if target.is_file():
            super().do_GET()
            return
        if self._looks_like_static_asset(path):
            self.send_error(404, "Not Found")
            return
        self._serve_index_html()

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0].startswith("/api"):
            self._proxy()
        else:
            self.send_error(405)

    def do_PUT(self) -> None:
        if self.path.split("?", 1)[0].startswith("/api"):
            self._proxy()
        else:
            self.send_error(405)

    def do_PATCH(self) -> None:
        if self.path.split("?", 1)[0].startswith("/api"):
            self._proxy()
        else:
            self.send_error(405)

    def do_DELETE(self) -> None:
        if self.path.split("?", 1)[0].startswith("/api"):
            self._proxy()
        else:
            self.send_error(405)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8765"))
    try:
        httpd = ReuseAddrThreadingHTTPServer(("127.0.0.1", port), Handler)
    except OSError as e:
        if e.errno == errno.EADDRINUSE:
            sys.stderr.write(
                "Port %d is already in use (another serve_local.py or app is running).\n"
                "  Stop it:  lsof -nP -iTCP:%d -sTCP:LISTEN   then   kill <PID>\n"
                "  Or use:   PORT=8770 python3 serve_local.py\n" % (port, port)
            )
            raise SystemExit(1) from e
        raise
    print("Open http://127.0.0.1:%d/ (API proxied: /api -> %s)" % (port, UPSTREAM))
    httpd.serve_forever()
