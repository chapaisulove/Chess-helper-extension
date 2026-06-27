// Floating UI control panel
const ui = document.createElement("div");
ui.id = "stockfish-helper-ui";
ui.style.position = "fixed";
ui.style.top = "10px";
ui.style.left = "10px";
ui.style.zIndex = "999999";
ui.style.backgroundColor = "#262421";
ui.style.color = "#bababa";
ui.style.padding = "10px";
ui.style.borderRadius = "8px";
ui.style.border = "2px solid #312e2b";
ui.style.fontFamily = "sans-serif";
ui.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";
ui.style.display = "flex";
ui.style.flexDirection = "column";
ui.style.gap = "8px";

const title = document.createElement("div");
title.innerText = "Stockfish Helper";
title.style.fontWeight = "bold";
title.style.color = "#81b64c";
title.style.textAlign = "center";
ui.appendChild(title);

const suggestBtn = document.createElement("button");
suggestBtn.innerText = "Suggest Move";
suggestBtn.style.backgroundColor = "#81b64c";
suggestBtn.style.color = "#fff";
suggestBtn.style.border = "none";
suggestBtn.style.padding = "6px 12px";
suggestBtn.style.borderRadius = "4px";
suggestBtn.style.cursor = "pointer";
suggestBtn.style.fontWeight = "bold";
suggestBtn.addEventListener("mouseover", () => suggestBtn.style.backgroundColor = "#a3d16c");
suggestBtn.addEventListener("mouseout", () => suggestBtn.style.backgroundColor = "#81b64c");
ui.appendChild(suggestBtn);

// Auto Suggest Checkbox UI
const toggleContainer = document.createElement("div");
toggleContainer.style.display = "flex";
toggleContainer.style.alignItems = "center";
toggleContainer.style.gap = "6px";
toggleContainer.style.fontSize = "12px";

const autoToggle = document.createElement("input");
autoToggle.type = "checkbox";
autoToggle.id = "auto-suggest-checkbox";

const autoLabel = document.createElement("label");
autoLabel.htmlFor = "auto-suggest-checkbox";
autoLabel.innerText = "Auto Suggest";
autoLabel.style.cursor = "pointer";

toggleContainer.appendChild(autoToggle);
toggleContainer.appendChild(autoLabel);
ui.appendChild(toggleContainer);

const statusText = document.createElement("div");
statusText.innerText = "Ready";
statusText.style.fontSize = "12px";
statusText.style.textAlign = "center";
ui.appendChild(statusText);

document.body.appendChild(ui);

let autoSuggestEnabled = false;
let observer = null;
let debounceTimeout = null;
let lastSentFen = "";

// Remove existing highlight overlays
function clearHighlights() {
  const existing = document.querySelectorAll(".stockfish-highlight");
  existing.forEach(el => el.remove());
}

// Draw highlight on a square
function highlightSquare(square, color, boardElement, isFlipped) {
  const files = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 };
  const fileChar = square[0];
  const rankNum = parseInt(square[1], 10);
  
  const fileVal = files[fileChar];
  const rankVal = rankNum;
  
  if (!fileVal || isNaN(rankVal)) return;

  const highlight = document.createElement("div");
  highlight.className = "stockfish-highlight";
  highlight.style.position = "absolute";
  highlight.style.width = "12.5%";
  highlight.style.height = "12.5%";
  highlight.style.pointerEvents = "none";
  highlight.style.backgroundColor = color;
  highlight.style.opacity = "0.5";
  highlight.style.zIndex = "10";

  let leftPercent, bottomPercent;
  if (isFlipped) {
    leftPercent = (8 - fileVal) * 12.5;
    bottomPercent = (rankVal - 1) * 12.5;
  } else {
    leftPercent = (fileVal - 1) * 12.5;
    bottomPercent = (rankVal - 1) * 12.5;
  }

  highlight.style.left = `${leftPercent}%`;
  highlight.style.bottom = `${bottomPercent}%`;

  boardElement.appendChild(highlight);
}

// Draw a directional arrow from start square to end square
function drawArrow(fromSquare, toSquare, boardElement, isFlipped) {
  const files = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 };
  
  const f1 = files[fromSquare[0]];
  const r1 = parseInt(fromSquare[1], 10);
  const f2 = files[toSquare[0]];
  const r2 = parseInt(toSquare[1], 10);

  if (!f1 || isNaN(r1) || !f2 || isNaN(r2)) return;

  let x1, y1, x2, y2;
  if (isFlipped) {
    x1 = (8.5 - f1) * 12.5;
    y1 = (r1 - 0.5) * 12.5;
    x2 = (8.5 - f2) * 12.5;
    y2 = (r2 - 0.5) * 12.5;
  } else {
    x1 = (f1 - 0.5) * 12.5;
    y1 = (8.5 - r1) * 12.5;
    x2 = (f2 - 0.5) * 12.5;
    y2 = (8.5 - r2) * 12.5;
  }

  // Create SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "stockfish-highlight stockfish-arrow");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "999";

  // Create marker definition for the arrowhead
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "stockfish-arrowhead");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("refX", "4");
  marker.setAttribute("refY", "3");
  marker.setAttribute("orient", "auto");

  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute("points", "0 0, 6 3, 0 6");
  polygon.setAttribute("fill", "#ff3b30"); // Highly visible bright red

  marker.appendChild(polygon);
  defs.appendChild(marker);
  svg.appendChild(defs);

  // Draw connecting line
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", `${x1}%`);
  line.setAttribute("y1", `${y1}%`);
  line.setAttribute("x2", `${x2}%`);
  line.setAttribute("y2", `${y2}%`);
  line.setAttribute("stroke", "#ff3b30");
  line.setAttribute("stroke-width", "5");
  line.setAttribute("marker-end", "url(#stockfish-arrowhead)");
  line.setAttribute("opacity", "0.8");

  svg.appendChild(line);
  boardElement.appendChild(svg);
}

function findBoardElement() {
  // Try <chess-board> first
  let el = document.querySelector("chess-board");
  if (el) return el;
  
  // Try elements with class/id board
  el = document.querySelector(".board") || document.getElementById("board") || document.querySelector(".chess-board");
  if (el) return el;
  
  // Fallback: look for the parent of the pieces
  const pieces = document.querySelectorAll(".piece");
  if (pieces.length > 0) {
    return pieces[0].parentElement;
  }
  return null;
}

// Generate FEN from board layout
function getFen() {
  const boardEl = findBoardElement();
  if (!boardEl) return null;

  const pieces = boardEl.querySelectorAll(".piece");
  const grid = Array(8).fill(null).map(() => Array(8).fill(null));

  pieces.forEach(piece => {
    const classList = piece.className.split(" ");
    let pieceType = null;
    let squareCoords = null;

    classList.forEach(cls => {
      // Find piece identity, e.g., 'wp', 'bp', 'wn', etc.
      if (cls.length === 2 && (cls.startsWith("w") || cls.startsWith("b"))) {
        pieceType = cls;
      }
      // Find square coordinates, e.g., 'square-12'
      if (cls.startsWith("square-")) {
        squareCoords = cls.replace("square-", "");
      }
    });

    if (pieceType && squareCoords && squareCoords.length === 2) {
      const file = parseInt(squareCoords[0], 10);
      const rank = parseInt(squareCoords[1], 10);

      // FEN mapping: rank 8 is row 0, rank 1 is row 7
      const row = 8 - rank;
      const col = file - 1;

      // Map piece to standard FEN chars
      const pMap = {
        wp: 'P', wn: 'N', wb: 'B', wr: 'R', wq: 'Q', wk: 'K',
        bp: 'p', bn: 'n', bb: 'b', br: 'r', bq: 'q', bk: 'k'
      };

      grid[row][col] = pMap[pieceType];
    }
  });

  // Build FEN board string
  const fenRows = [];
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    let rowStr = "";
    for (let c = 0; c < 8; c++) {
      if (grid[r][c] === null) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rowStr += emptyCount;
          emptyCount = 0;
        }
        rowStr += grid[r][c];
      }
    }
    if (emptyCount > 0) {
      rowStr += emptyCount;
    }
    fenRows.push(rowStr);
  }

  const boardFen = fenRows.join("/");

  // Determine active turn
  let activeColor = "w";
  const whiteClockTurn = document.querySelector(".clock-white.clock-player-turn");
  const blackClockTurn = document.querySelector(".clock-black.clock-player-turn");
  
  if (whiteClockTurn) {
    activeColor = "w";
  } else if (blackClockTurn) {
    activeColor = "b";
  } else {
    // Fallback: check move list
    const moves = document.querySelectorAll(".move");
    if (moves.length > 0) {
      const lastMove = moves[moves.length - 1];
      // If white node exists but black node doesn't, it's black's turn
      const nodes = lastMove.querySelectorAll(".node");
      if (nodes.length === 1) {
        activeColor = "b";
      }
    }
  }

  // Return partial FEN (board state + turn)
  return `${boardFen} ${activeColor} KQkq - 0 1`;
}

// Request and draw move suggestion
async function suggestMove() {
  const boardEl = findBoardElement();
  if (!boardEl) {
    statusText.innerText = "No chess board found!";
    return;
  }

  const fen = getFen();
  if (!fen) {
    statusText.innerText = "Error parsing board!";
    return;
  }

  // If FEN hasn't changed, don't query
  if (fen === lastSentFen) return;
  lastSentFen = fen;

  clearHighlights();
  statusText.innerText = "Thinking...";
  const isFlipped = boardEl.classList.contains("flipped");

  try {
    const response = await fetch("http://localhost:8000/get_move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fen })
    });

    if (!response.ok) {
      throw new Error("HTTP error " + response.status);
    }

    const result = await response.json();
    if (result.bestmove) {
      const move = result.bestmove; // e.g. "e2e4" or "e7e8q"
      const from = move.substring(0, 2);
      const to = move.substring(2, 4);

      // Use clearly distinct colors: Orange for START (what to move), Green for END (where to move)
      highlightSquare(from, "rgba(255, 102, 0, 0.45)", boardEl, isFlipped); // Bright Orange Start
      highlightSquare(to, "rgba(52, 199, 89, 0.45)", boardEl, isFlipped);  // Apple Green End
      
      // Draw a bright red directional arrow from START to END
      drawArrow(from, to, boardEl, isFlipped);

      statusText.innerText = `Move: ${move}`;
    } else {
      statusText.innerText = "No move suggested.";
    }
  } catch (err) {
    console.error(err);
    statusText.innerText = "Error: " + err.message;
  }
}

// Observe board modifications for auto-suggestion
function startObserving() {
  const boardEl = findBoardElement();
  if (!boardEl) return;

  if (observer) observer.disconnect();

  observer = new MutationObserver((mutations) => {
    let pieceChanged = false;
    for (let mutation of mutations) {
      if (mutation.type === "childList" || (mutation.type === "attributes" && mutation.attributeName === "class")) {
        pieceChanged = true;
        break;
      }
    }
    if (pieceChanged) {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        suggestMove();
      }, 300); // 300ms debounce to wait for animations to complete
    }
  });

  observer.observe(boardEl, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"]
  });
}

function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }
}

// Click event listener
suggestBtn.addEventListener("click", () => {
  suggestMove();
});

// Toggle listener
autoToggle.addEventListener("change", (e) => {
  autoSuggestEnabled = e.target.checked;
  if (autoSuggestEnabled) {
    suggestMove();
    startObserving();
  } else {
    stopObserving();
    clearHighlights();
    statusText.innerText = "Ready";
    lastSentFen = "";
  }
});
