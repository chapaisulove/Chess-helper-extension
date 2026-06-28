import http.server
import json
import subprocess
import os
import threading

PORT = 8000
STOCKFISH_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stockfish-windows-x86-64-avx2.exe")


class StockfishEngine:
    """Wraps a Stockfish subprocess.
    
    IMPORTANT: The lock is only held in get_best_move().
    _send() and _read() are internal helpers that must be called
    with the lock already held — they do NOT acquire the lock themselves.
    This avoids the deadlock that occurred when send()/readline()
    each tried to acquire a non-reentrant lock that was already held.
    """

    def __init__(self):
        if not os.path.exists(STOCKFISH_PATH):
            raise FileNotFoundError(f"Stockfish not found: {STOCKFISH_PATH}")
        self.lock = threading.Lock()
        self.process = None
        self._launch()

    def _launch(self):
        """Start the Stockfish process and wait for it to be ready."""
        self.process = subprocess.Popen(
            [STOCKFISH_PATH],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
        )
        # Send UCI init
        self.process.stdin.write("uci\nisready\n")
        self.process.stdin.flush()
        # Wait for engine ready
        for _ in range(200):  # max 200 lines before giving up
            line = self.process.stdout.readline().strip()
            if line == "readyok":
                return
        raise RuntimeError("Stockfish did not respond with readyok")

    def _send(self, cmd: str):
        """Send command — caller must hold self.lock."""
        self.process.stdin.write(cmd + "\n")
        self.process.stdin.flush()

    def _read(self) -> str:
        """Read one line — caller must hold self.lock."""
        return self.process.stdout.readline().strip()

    def _check_alive(self):
        """Restart if process died or communication pipes are broken — caller must hold self.lock."""
        is_alive = False
        if self.process is not None and self.process.poll() is None:
            # Try checking if stdout/stdin streams are still open and not closed
            if self.process.stdin and not self.process.stdin.closed and self.process.stdout and not self.process.stdout.closed:
                is_alive = True
        
        if not is_alive:
            print("Stockfish process died or communication pipes broken. Restarting engine...")
            if self.process:
                try:
                    self.process.terminate()
                    self.process.wait(timeout=1)
                except Exception:
                    pass
            self._launch()

    def get_best_move(self, fen: str) -> str:
        """Thread-safe: compute best move for a given FEN string."""
        with self.lock:
            self._check_alive()
            self._send(f"position fen {fen}")
            self._send("go depth 12")
            for _ in range(500):  # safety limit
                line = self._read()
                if not line:
                    break
                if line.startswith("bestmove"):
                    parts = line.split()
                    if len(parts) >= 2 and parts[1] != "(none)":
                        return parts[1]
                    return None
        return None

    def close(self):
        with self.lock:
            try:
                self._send("quit")
            except Exception:
                pass
            try:
                self.process.terminate()
                self.process.wait(timeout=3)
            except Exception:
                pass


# Single global engine instance
engine = StockfishEngine()
print("Stockfish engine started successfully.")


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Print request log to console
        print(f"[{self.address_string()}] {format % args}")

    def _send_json(self, code: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path != "/get_move":
            self._send_json(404, {"error": "Not found"})
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            data = json.loads(body.decode("utf-8"))
        except Exception:
            self._send_json(400, {"error": "Invalid JSON"})
            return

        fen = data.get("fen", "").strip()
        if not fen:
            self._send_json(400, {"error": "Missing fen"})
            return

        try:
            move = engine.get_best_move(fen)
            self._send_json(200, {"bestmove": move})
        except Exception as e:
            self._send_json(500, {"error": str(e)})


def run():
    httpd = http.server.HTTPServer(("", PORT), Handler)
    print(f"Server listening on http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping...")
        engine.close()
        httpd.server_close()


if __name__ == "__main__":
    run()
