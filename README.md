<div align="center">

# ♟️ Chess Stockfish Helper

### A Chrome/Brave extension powered by a local Stockfish engine that **highlights the best move** on chess.com in real-time — automatically after every move.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.x-blue?logo=python)](https://www.python.org/)
[![Stockfish](https://img.shields.io/badge/Engine-Stockfish%2016-red?logo=chess.com)](https://stockfishchess.org/)
[![Browser](https://img.shields.io/badge/Browser-Chrome%20%7C%20Brave-yellow?logo=googlechrome)](https://www.google.com/chrome/)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🟠 **Start Square** | Bright orange highlight on the piece to move |
| 🟢 **End Square** | Apple green highlight on the destination |
| 🔴 **Arrow Overlay** | Bold red SVG arrow pointing from → to |
| ⚡ **Auto Suggest** | Automatically updates after every move via MutationObserver |
| 🔄 **Auto Recovery** | Stockfish process restarts itself if it crashes mid-game |
| 🖥️ **Local & Private** | Runs 100% on your machine — nothing sent to the cloud |

---

## 📁 Project Structure

```
chess-stockfish-helper/
│
├── stockfish/
│   ├── server.py                          # Local Python HTTP server (UCI wrapper)
│   └── stockfish-windows-x86-64-avx2.exe # Stockfish engine binary
│
├── extension/
│   ├── manifest.json                      # Chrome Extension Manifest V3
│   └── content.js                         # Board reader + UI + arrow drawing
│
└── run_stockfish_helper.bat               # 🚀 One-click launcher (Windows)
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.x** installed ([Download](https://www.python.org/downloads/))
- **Google Chrome** or **Brave** browser
- **Stockfish** binary (already included in the `stockfish/` folder)

---

### Step 1 — Launch the Local Server

> **The easiest way:** Just double-click `run_stockfish_helper.bat`.

It will automatically find `server.py`, navigate to the right folder, and start the local backend on `http://localhost:8000`.

Keep the terminal window open while you play. You can minimize it.

---

### Step 2 — Install the Chrome Extension

1. Open **Chrome** or **Brave** and navigate to:
   - Chrome: `chrome://extensions/`
   - Brave: `brave://extensions/`

2. Enable **Developer Mode** (toggle in the top-right corner).

3. Click **Load unpacked** and select the `extension/` folder from this project.

4. The extension is now installed! 🎉

---

### Step 3 — Play on Chess.com

1. Go to [chess.com](https://www.chess.com) and start a game.
2. A **Stockfish Helper** panel will appear in the top-left corner.
3. Click **Suggest Move** for a one-time suggestion, or tick **Auto Suggest** to get a new suggestion after every move automatically.

---

## 🎮 How It Works

```
chess.com Board (DOM)
        │
        ▼
  content.js reads piece positions
  and builds a FEN string
        │
        ▼
  POST http://localhost:8000/get_move
  { "fen": "rnbqkbnr/pppp..." }
        │
        ▼
  server.py feeds FEN to Stockfish binary
  via UCI protocol (depth 10, ~20ms)
        │
        ▼
  Stockfish returns "bestmove e2e4"
        │
        ▼
  content.js draws:
  🟠 Orange square (piece to move)
  🟢 Green square  (where to move)
  🔴 Red SVG arrow (direction)
```

---

## ⚙️ Configuration

You can change the search depth in `server.py` to control the engine's strength vs. speed:

```python
# In server.py, line ~66:
self.send("go depth 10")   # depth 10 = ~20ms (default, fast)
# self.send("go depth 15") # depth 15 = ~100ms (stronger)
# self.send("go depth 20") # depth 20 = ~500ms+ (very strong)
```

---

## 🛡️ Auto Recovery

The server monitors the Stockfish process health before every request. If the engine crashes:
1. The old process is terminated cleanly.
2. A new Stockfish process is automatically started.
3. Your move suggestion request is retried.

No manual restarts needed.

---

## ⚠️ Disclaimer

This project is intended for **learning and analysis purposes only**. Using engine assistance during rated games may violate [chess.com's Fair Play policy](https://www.chess.com/article/view/chess-com-fair-play-and-cheat-detection). Use responsibly.

---

## 📜 License

MIT License — free to use, modify, and distribute.

---

<div align="center">
Made with ♟️ and Python
</div>
