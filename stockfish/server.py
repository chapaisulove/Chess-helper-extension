import http.server
import json
import subprocess
import os
import sys
import threading

PORT = 8000
STOCKFISH_PATH = os.path.join(os.path.dirname(__file__), "stockfish-windows-x86-64-avx2.exe")

class StockfishEngine:
    def ensure_process(self):
        # Check if process died
        if self.process.poll() is not None:
            print("Stockfish process died. Restarting...")
            self.start_process()

    def start_process(self):
        self.process = subprocess.Popen(
            [STOCKFISH_PATH],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        # Directly write to stdin to avoid recursive send()
        self.process.stdin.write("uci\nisready\n")
        self.process.stdin.flush()
        
        while True:
            line = self.process.stdout.readline().strip()
            if line == "readyok":
                break

    def __init__(self):
        if not os.path.exists(STOCKFISH_PATH):
            raise FileNotFoundError(f"Stockfish binary not found at {STOCKFISH_PATH}")
        
        self.lock = threading.Lock()
        print("Starting Stockfish process...")
        self.start_process()
        print("Stockfish engine is ready.")

    def send(self, command):
        try:
            self.process.stdin.write(command + "\n")
            self.process.stdin.flush()
        except Exception as e:
            print(f"Error sending command to Stockfish: {e}")
            # Non-recursive re-initialization if writing fails
            try:
                self.process.terminate()
            except:
                pass
            self.start_process()
            self.process.stdin.write(command + "\n")
            self.process.stdin.flush()

    def readline(self):
        try:
            return self.process.stdout.readline().strip()
        except Exception as e:
            print(f"Error reading from Stockfish: {e}")
            return ""

    def get_best_move(self, fen):
        with self.lock:
            self.ensure_process()
            # Set position
            self.send(f"position fen {fen}")
            # Search with depth 10 (extremely fast, ~10-50ms, yet plays at a high level)
            self.send("go depth 10")
            
            while True:
                line = self.readline()
                if not line: # Subprocess crash or read failure
                    break
                if line.startswith("bestmove"):
                    parts = line.split()
                    if len(parts) >= 2:
                        return parts[1]
                    break
        return None

    def close(self):
        try:
            self.send("quit")
        except:
            pass
        if self.process:
            self.process.terminate()
            self.process.wait()

# Global engine instance
engine = None

class StockfishHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path == "/get_move":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                fen = data.get("fen")
                if not fen:
                    raise ValueError("Missing 'fen' field")
                
                best_move = engine.get_best_move(fen)
                
                response_data = {"bestmove": best_move}
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run():
    global engine
    try:
        engine = StockfishEngine()
    except Exception as e:
        print(f"Error starting Stockfish: {e}")
        sys.exit(1)

    print(f"Starting web server on http://localhost:{PORT}")
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, StockfishHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        engine.close()
        httpd.server_close()

if __name__ == '__main__':
    run()
