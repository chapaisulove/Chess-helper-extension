// === Stockfish Helper Extension =============================================

// â”€â”€â”€ UI Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ui = document.createElement('div');
ui.id = 'stockfish-helper-ui';
Object.assign(ui.style, {
  position: 'fixed', top: '10px', left: '10px', zIndex: '999999',
  backgroundColor: '#262421', color: '#bababa', padding: '12px',
  borderRadius: '10px', border: '2px solid #81b64c', fontFamily: 'sans-serif',
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)', display: 'flex',
  flexDirection: 'column', gap: '8px', minWidth: '160px',
  cursor: 'move',
  userSelect: 'none',
});

const title = document.createElement('div');
title.innerText = 'Stockfish Helper';
Object.assign(title.style, { fontWeight: 'bold', color: '#81b64c', textAlign: 'center', fontSize: '14px', pointerEvents: 'none' });
ui.appendChild(title);

const suggestBtn = document.createElement('button');
suggestBtn.id = 'sf-suggest-btn';
suggestBtn.innerText = 'Suggest Move';
Object.assign(suggestBtn.style, {
  backgroundColor: '#81b64c', color: '#fff', border: 'none',
  padding: '7px 14px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
});
suggestBtn.addEventListener('mouseover', () => suggestBtn.style.backgroundColor = '#a3d16c');
suggestBtn.addEventListener('mouseout',  () => suggestBtn.style.backgroundColor = '#81b64c');
ui.appendChild(suggestBtn);

const toggleRow = document.createElement('div');
Object.assign(toggleRow.style, { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' });
const autoToggle = document.createElement('input');
autoToggle.type = 'checkbox';
autoToggle.id = 'sf-auto-toggle';
const autoLabel = document.createElement('label');
autoLabel.htmlFor = 'sf-auto-toggle';
autoLabel.innerText = 'Auto Suggest';
autoLabel.style.cursor = 'pointer';
toggleRow.appendChild(autoToggle);
toggleRow.appendChild(autoLabel);
ui.appendChild(toggleRow);

const statusText = document.createElement('div');
statusText.id = 'sf-status';
statusText.innerText = 'Ready';
Object.assign(statusText.style, { fontSize: '11px', textAlign: 'center', wordBreak: 'break-word', pointerEvents: 'none' });
ui.appendChild(statusText);

document.body.appendChild(ui);

// Draggable functionality
let isDragging = false;
let dragStartX, dragStartY;
let dragStartLeft, dragStartTop;

ui.addEventListener('mousedown', (e) => {
  // Don't drag if clicking buttons or checkboxes
  if (e.target === suggestBtn || e.target === autoToggle || e.target === autoLabel) return;
  
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  const rect = ui.getBoundingClientRect();
  dragStartLeft = rect.left;
  dragStartTop = rect.top;
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  ui.style.left = `${dragStartLeft + dx}px`;
  ui.style.top = `${dragStartTop + dy}px`;
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

// â”€â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let autoEnabled = false;
let observer    = null;
let debounce    = null;
let lastFen     = '';

// â”€â”€â”€ Board helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function clearHighlights() {
  document.querySelectorAll('.sf-highlight').forEach(el => el.remove());
}

function findBoard() {
  return (
    document.querySelector('chess-board') ||
    document.querySelector('.board')      ||
    document.getElementById('board')      ||
    (() => { const p = document.querySelector('.piece'); return p ? p.parentElement : null; })()
  );
}

function highlightSquare(sq, color, board, flipped) {
  const FILES = { a:1, b:2, c:3, d:4, e:5, f:6, g:7, h:8 };
  const file = FILES[sq[0]], rank = parseInt(sq[1], 10);
  if (!file || isNaN(rank)) return;
  const left   = flipped ? (8 - file) * 12.5 : (file - 1) * 12.5;
  const bottom = (rank - 1) * 12.5;
  const div = document.createElement('div');
  div.className = 'sf-highlight';
  Object.assign(div.style, {
    position: 'absolute', width: '12.5%', height: '12.5%',
    left: left + '%', bottom: bottom + '%',
    backgroundColor: color, opacity: '0.55', pointerEvents: 'none', zIndex: '10',
  });
  board.appendChild(div);
}

function drawArrow(from, to, board, flipped) {
  const FILES = { a:1, b:2, c:3, d:4, e:5, f:6, g:7, h:8 };
  const f1 = FILES[from[0]], r1 = parseInt(from[1], 10);
  const f2 = FILES[to[0]],   r2 = parseInt(to[1], 10);
  if (!f1 || !f2) return;
  const cx = f => flipped ? (8.5 - f) * 12.5 : (f - 0.5) * 12.5;
  const cy = r => flipped ? (r - 0.5) * 12.5 : (8.5 - r) * 12.5;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'sf-highlight');
  Object.assign(svg.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '999' });
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'sf-head');
  marker.setAttribute('markerWidth', '8'); marker.setAttribute('markerHeight', '8');
  marker.setAttribute('refX', '4'); marker.setAttribute('refY', '3'); marker.setAttribute('orient', 'auto');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('points', '0 0, 6 3, 0 6'); poly.setAttribute('fill', '#ff3b30');
  marker.appendChild(poly); defs.appendChild(marker); svg.appendChild(defs);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', cx(f1) + '%'); line.setAttribute('y1', cy(r1) + '%');
  line.setAttribute('x2', cx(f2) + '%'); line.setAttribute('y2', cy(r2) + '%');
  line.setAttribute('stroke', '#ff3b30'); line.setAttribute('stroke-width', '5');
  line.setAttribute('marker-end', 'url(#sf-head)'); line.setAttribute('opacity', '0.85');
  svg.appendChild(line); board.appendChild(svg);
}

function getFen() {
  const board = findBoard();
  if (!board) return null;
  const grid = Array.from({ length: 8 }, () => Array(8).fill(null));
  const PMAP = { wp:'P',wn:'N',wb:'B',wr:'R',wq:'Q',wk:'K', bp:'p',bn:'n',bb:'b',br:'r',bq:'q',bk:'k' };
  board.querySelectorAll('.piece').forEach(piece => {
    let type = null, sq = null;
    piece.className.split(' ').forEach(cls => {
      if (cls.length === 2 && (cls.startsWith('w') || cls.startsWith('b'))) type = cls;
      if (cls.startsWith('square-')) sq = cls.slice(7);
    });
    if (type && sq && sq.length === 2) {
      const col = parseInt(sq[0], 10) - 1, row = 8 - parseInt(sq[1], 10);
      if (PMAP[type] && row >= 0 && row < 8 && col >= 0 && col < 8) grid[row][col] = PMAP[type];
    }
  });
  const fenRows = grid.map(row => {
    let s = '', e = 0;
    row.forEach(c => { if (c) { if (e) { s += e; e = 0; } s += c; } else e++; });
    if (e) s += e;
    return s;
  });
  let color = 'w';
  if (document.querySelector('.clock-black.clock-player-turn')) color = 'b';
  else if (document.querySelector('.clock-white.clock-player-turn')) color = 'w';
  else if (document.querySelectorAll('.move .node').length % 2 === 1) color = 'b';
  return fenRows.join('/') + ' ' + color + ' KQkq - 0 1';
}

// â”€â”€â”€ Fetch best move from server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function suggestMove() {
  const board = findBoard();
  if (!board) { statusText.innerText = 'No board found'; return; }
  
  const flipped = board.classList.contains('flipped');
  const isWhiteTurn = !!document.querySelector('.clock-white.clock-player-turn');
  const isBlackTurn = !!document.querySelector('.clock-black.clock-player-turn');

  // Check if it is the user's turn
  const isUserTurn = flipped ? isBlackTurn : isWhiteTurn;

  // Only check clocks if a turn clock is actually active on the page.
  // If neither clock is showing the turn (e.g. before the game starts), we can suggest moves.
  const clocksActive = isWhiteTurn || isBlackTurn;

  if (clocksActive && !isUserTurn) {
    statusText.innerText = "Opponent's turn. Waiting...";
    clearHighlights();
    return;
  }

  const fen = getFen();
  if (!fen) { statusText.innerText = 'Cannot read board'; return; }
  if (fen === lastFen) return;
  lastFen = fen;
  clearHighlights();
  statusText.innerText = 'Thinking...';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch('http://localhost:8000/get_move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen }),
      mode: 'cors',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) { statusText.innerText = 'Server error ' + res.status; return; }
    const data = await res.json();
    const move = data.bestmove;
    if (!move) { statusText.innerText = 'No move'; return; }
    const from = move.slice(0, 2), to = move.slice(2, 4);
    highlightSquare(from, 'rgba(255,102,0,0.45)', board, flipped);
    highlightSquare(to,   'rgba(52,199,89,0.45)',  board, flipped);
    drawArrow(from, to, board, flipped);
    statusText.innerText = 'Best: ' + move;
  } catch (err) {
    clearTimeout(timer);
    statusText.innerText = err.name === 'AbortError'
      ? 'Timeout - is server running?'
      : 'Error: ' + err.message;
    console.error('[SF Helper]', err);
  }
}

// â”€â”€â”€ Auto observer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function startObserver() {
  const board = findBoard(); if (!board) return;
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => { clearTimeout(debounce); debounce = setTimeout(suggestMove, 400); });
  observer.observe(board, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

function stopObserver() {
  if (observer) { observer.disconnect(); observer = null; }
  clearTimeout(debounce); debounce = null;
}

// â”€â”€â”€ Event listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

suggestBtn.addEventListener('click', suggestMove);

autoToggle.addEventListener('change', e => {
  autoEnabled = e.target.checked;
  if (autoEnabled) { suggestMove(); startObserver(); }
  else { stopObserver(); clearHighlights(); statusText.innerText = 'Ready'; lastFen = ''; }
});