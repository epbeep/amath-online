const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.use((req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ---------------------------------------------------------------------------
// Tile pool config
// ---------------------------------------------------------------------------
const A_MATH_CONFIG = [
  { symbol: "0", count: 5, score: 1, type: "number" },
  { symbol: "1", count: 6, score: 1, type: "number" },
  { symbol: "2", count: 6, score: 1, type: "number" },
  { symbol: "3", count: 5, score: 1, type: "number" },
  { symbol: "4", count: 5, score: 2, type: "number" },
  { symbol: "5", count: 4, score: 2, type: "number" },
  { symbol: "6", count: 4, score: 2, type: "number" },
  { symbol: "7", count: 4, score: 2, type: "number" },
  { symbol: "8", count: 4, score: 2, type: "number" },
  { symbol: "9", count: 4, score: 2, type: "number" },
  { symbol: "10", count: 2, score: 3, type: "number" },
  { symbol: "11", count: 1, score: 4, type: "number" },
  { symbol: "12", count: 2, score: 3, type: "number" },
  { symbol: "13", count: 1, score: 6, type: "number" },
  { symbol: "14", count: 1, score: 4, type: "number" },
  { symbol: "15", count: 1, score: 4, type: "number" },
  { symbol: "16", count: 1, score: 4, type: "number" },
  { symbol: "17", count: 1, score: 6, type: "number" },
  { symbol: "18", count: 1, score: 4, type: "number" },
  { symbol: "19", count: 1, score: 7, type: "number" },
  { symbol: "20", count: 1, score: 5, type: "number" },
  { symbol: "+", count: 4, score: 2, type: "operator" },
  { symbol: "-", count: 4, score: 2, type: "operator" },
  { symbol: "+/-", count: 5, score: 1, type: "operator" },
  { symbol: "x", count: 4, score: 2, type: "operator" },
  { symbol: "÷", count: 4, score: 2, type: "operator" },
  { symbol: "x/÷", count: 4, score: 1, type: "operator" },
  { symbol: "=", count: 11, score: 1, type: "equal" },
  { symbol: "BLANK", count: 4, score: 0, type: "wildcard" }
];

const BOARD_LAYOUT = [
  ["3E", "NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "3E", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL", "3E"],
  ["NORMAL", "2E", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "2E", "NORMAL"],
  ["NORMAL", "NORMAL", "2E", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "2E", "NORMAL", "NORMAL"],
  ["2P", "NORMAL", "NORMAL", "2E", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "2E", "NORMAL", "NORMAL", "2P"],
  ["NORMAL", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "NORMAL"],
  ["NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL"],
  ["NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL"],
  ["3E", "NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "CENTER", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL", "3E"],
  ["NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL"],
  ["NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL"],
  ["NORMAL", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "NORMAL"],
  ["2P", "NORMAL", "NORMAL", "2E", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "2E", "NORMAL", "NORMAL", "2P"],
  ["NORMAL", "NORMAL", "2E", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "2E", "NORMAL", "NORMAL"],
  ["NORMAL", "2E", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "3P", "NORMAL", "NORMAL", "NORMAL", "2E", "NORMAL"],
  ["3E", "NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL", "NORMAL", "3E", "NORMAL", "NORMAL", "NORMAL", "2P", "NORMAL", "NORMAL", "3E"]
];

const CENTER_ROW = 7, CENTER_COL = 7;
const OPERATORS = ['+', '-', 'x', '÷'];
const BINGO_BONUS = 40; // bonus for using all 8 tiles from hand in a single turn

// ---------------------------------------------------------------------------
// Item cards
// ---------------------------------------------------------------------------
const CARD_DRAW_COOLDOWN_TURNS = 5;
const MAX_CARDS_IN_HAND = 2;

// weight = relative draw chance; higher stars = lower weight
const CARD_POOL = [
  { id: 'freeze_time', name: 'แช่แข็งเวลา', stars: 2, weight: 30 },
  { id: 'disable_specials', name: 'ยกเลิกช่องพิเศษ', stars: 2, weight: 30 },
  { id: 'free_blank', name: 'วางแทน BLANK ฟรี', stars: 3, weight: 20 },
  { id: 'cell_lock', name: 'ล็อกช่อง', stars: 3, weight: 20 },
  { id: 'tile_swap_3', name: 'สลับเบี้ยคู่แข่ง 3 ตัว', stars: 4, weight: 10 },
  { id: 'double_score', name: 'Double Score', stars: 4, weight: 10 },
  { id: 'equal_strike', name: 'Equal Strike', stars: 4, weight: 10 },
  { id: 'swap_rack', name: 'Swap Rack', stars: 5, weight: 5 }
];

function drawRandomCard() {
  const totalWeight = CARD_POOL.reduce((s, c) => s + c.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const card of CARD_POOL) {
    if (roll < card.weight) return card;
    roll -= card.weight;
  }
  return CARD_POOL[CARD_POOL.length - 1];
}

function createShuffledBag() {
  const bag = [];
  let idx = 0;
  A_MATH_CONFIG.forEach(item => {
    for (let i = 0; i < item.count; i++) {
      bag.push({ id: `t_${Date.now()}_${idx++}_${Math.random().toString(36).slice(2, 6)}`, symbol: item.symbol, score: item.score, type: item.type });
    }
  });
  return bag.sort(() => Math.random() - 0.5);
}

function isValidInitialHand(hand) {
  // must contain a real '=' tile and a real operator tile — a BLANK can't stand in for
  // either of these, or a hand could pass this check with no way to actually form an equation
  const hasEqual = hand.some(t => t.symbol === '=');
  const hasOperator = hand.some(t => ['+', '-', 'x', '÷', '+/-', 'x/÷'].includes(t.symbol));
  const hasNumber = hand.some(t => t.type === 'number' || t.symbol === 'BLANK');
  return hasEqual && hasOperator && hasNumber;
}

function dealInitialHands() {
  let bag = createShuffledBag();
  let p1Hand = [], p2Hand = [];

  let attempts = 0;
  while (attempts < 300) {
    p1Hand = bag.slice(0, 8);
    if (isValidInitialHand(p1Hand)) { bag = bag.slice(8); break; }
    bag.sort(() => Math.random() - 0.5);
    attempts++;
  }

  attempts = 0;
  while (attempts < 300) {
    p2Hand = bag.slice(0, 8);
    if (isValidInitialHand(p2Hand)) { bag = bag.slice(8); break; }
    bag.sort(() => Math.random() - 0.5);
    attempts++;
  }

  return { p1Hand, p2Hand, remainingBag: bag };
}

// ---------------------------------------------------------------------------
// Equation validation & evaluation
// ---------------------------------------------------------------------------
function isNumberToken(tok) { return /^\d+$/.test(tok) && Number(tok) >= 0 && Number(tok) <= 20; }

// Evaluate a token side (e.g. ["3","+","4","x","2"]) with x/÷ before +/-.
// Returns a number, or null if malformed / invalid (e.g. divide by zero).
function evalSide(tokens) {
  if (tokens.length === 0 || tokens.length % 2 === 0) return null;
  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0 && !isNumberToken(tokens[i])) return null;
    if (i % 2 === 1 && !OPERATORS.includes(tokens[i])) return null;
  }
  const nums = tokens.filter((_, i) => i % 2 === 0).map(Number);
  const ops = tokens.filter((_, i) => i % 2 === 1);

  const passNums = [nums[0]];
  const passOps = [];
  for (let i = 0; i < ops.length; i++) {
    if (ops[i] === 'x' || ops[i] === '÷') {
      const prev = passNums.pop();
      const next = nums[i + 1];
      if (ops[i] === 'x') passNums.push(prev * next);
      else {
        if (next === 0) return null;
        passNums.push(prev / next);
      }
    } else {
      passNums.push(nums[i + 1]);
      passOps.push(ops[i]);
    }
  }

  let result = passNums[0];
  for (let i = 0; i < passOps.length; i++) {
    result = passOps[i] === '+' ? result + passNums[i + 1] : result - passNums[i + 1];
  }
  return result;
}

// tokens: array of display symbols for a full line/sequence of cells.
// tokens: array of display symbols for a full line/sequence of cells.
// Supports chained equalities (A=B=C=...) — every segment split by '=' must evaluate to the same value.
function validateEquation(tokens) {
  if (tokens.length < 3) return false;

  const segments = [[]];
  for (const t of tokens) {
    if (t === '=') segments.push([]);
    else segments[segments.length - 1].push(t);
  }
  if (segments.length < 2) return false; // need at least one '='

  const values = segments.map(evalSide);
  if (values.some(v => v === null)) return false;

  const first = values[0];
  return values.every(v => Math.abs(v - first) < 1e-9);
}

// ---------------------------------------------------------------------------
// Room state
// ---------------------------------------------------------------------------
const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function emptyGrid() {
  return Array(15).fill(null).map(() => Array(15).fill(null));
}

function publicGridCells(grid) {
  const cells = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      if (grid[r][c]) cells.push({ row: r, col: c, tile: grid[r][c] });
    }
  }
  return cells;
}

function otherRole(role) { return role === 'P1' ? 'P2' : 'P1'; }

function advanceTurn(room, toRole) {
  room.currentTurn = toRole;
  if (room.cardCooldown[toRole] > 0) room.cardCooldown[toRole]--;
}

// clears one-shot effects that were scoped to `role`'s turn, once that turn is over
function consumeEffectsFor(room, role) {
  if (room.effects.disableSpecialsFor === role) room.effects.disableSpecialsFor = null;
  if (room.effects.equalsLockedFor === role) room.effects.equalsLockedFor = null;
  if (room.effects.cellLocked && room.effects.cellLocked.forRole === role) room.effects.cellLocked = null;
  if (room.effects.doubleScoreFor === role) room.effects.doubleScoreFor = null;
}

function cardSnapshot(room, role) {
  return { cardHand: room.cardHands[role], cooldown: room.cardCooldown[role] };
}

function findPlayer(room, socketId) {
  return room.players.find(p => p.socketId === socketId);
}

function findPlayerBySession(room, sessionId) {
  return room.players.find(p => p.sessionId === sessionId);
}

function sendState(socketId, room, role) {
  io.to(socketId).emit('state_sync', {
    role,
    hand: room.hands[role],
    gridCells: publicGridCells(room.grid),
    scores: room.scores,
    currentTurn: room.currentTurn,
    timers: room.timers,
    bagLeft: room.bag.length,
    gameOver: room.gameOver || null,
    cardHand: room.cardHands[role],
    cardCooldown: room.cardCooldown[role]
  });
}

// Attempts to build & validate the placement, returning either
// { ok:true, score, gridUpdates } or { ok:false, reason }
// `moverRole` and `room.effects` are consulted for active item-card effects.
function evaluateMove(room, placements, moverRole) {
  if (placements.length === 0) return { ok: false, reason: 'ไม่มีเบี้ยที่วาง' };

  const rows = new Set(placements.map(p => p.row));
  const cols = new Set(placements.map(p => p.col));
  for (const p of placements) {
    if (p.row < 0 || p.row > 14 || p.col < 0 || p.col > 14) return { ok: false, reason: 'ตำแหน่งนอกกระดาน' };
    if (room.grid[p.row][p.col]) return { ok: false, reason: 'ช่องนี้มีเบี้ยอยู่แล้ว' };
  }
  // duplicate target cells within same submission
  const seen = new Set();
  for (const p of placements) {
    const key = `${p.row},${p.col}`;
    if (seen.has(key)) return { ok: false, reason: 'วางเบี้ยซ้อนกันไม่ได้' };
    seen.add(key);
  }

  // --- item-card effects ---
  const eq = room.effects;
  if (eq.equalsLockedFor === moverRole && placements.some(p => p.displaySymbol === '=')) {
    return { ok: false, reason: 'ตานี้ถูกล็อกด้วย Equal Strike ห้ามใช้เครื่องหมาย =' };
  }
  if (eq.cellLocked && eq.cellLocked.forRole === moverRole) {
    const { row, col } = eq.cellLocked;
    if (placements.some(p => p.row === row && p.col === col)) {
      return { ok: false, reason: 'ช่องนี้ถูกล็อกไว้ตานี้' };
    }
  }
  const specialsDisabled = eq.disableSpecialsFor === moverRole;
  const scoreMultiplier = eq.doubleScoreFor === moverRole ? 2 : 1;

  if (placements.length > 1 && rows.size > 1 && cols.size > 1) {
    return { ok: false, reason: 'ต้องวางเบี้ยเป็นแนวเดียวกัน (แนวนอนหรือแนวตั้ง)' };
  }

  const boardEmpty = room.grid.every(row => row.every(cell => !cell));
  if (boardEmpty) {
    const coversCenter = placements.some(p => p.row === CENTER_ROW && p.col === CENTER_COL);
    if (!coversCenter) return { ok: false, reason: 'ตาแรกต้องวางทับช่องดาวตรงกลาง' };
  }

  // Build a temp lookup: symbol/score at (r,c), either from existing grid or new placement
  const at = (r, c) => {
    const p = placements.find(pl => pl.row === r && pl.col === c);
    if (p) return { symbol: p.displaySymbol, score: p.baseScore, isNew: true };
    if (room.grid[r][c]) return { symbol: room.grid[r][c].symbol, score: room.grid[r][c].score, isNew: false };
    return null;
  };

  function buildSequence(row, col, dir) {
    // dir: 'H' or 'V'. Walk backward then forward through filled cells.
    let r = row, c = col;
    while (true) {
      const pr = dir === 'H' ? r : r - 1;
      const pc = dir === 'H' ? c - 1 : c;
      if (at(pr, pc)) { r = pr; c = pc; } else break;
    }
    const cells = [];
    let cr = r, cc = c;
    while (at(cr, cc)) {
      cells.push({ row: cr, col: cc, ...at(cr, cc) });
      if (dir === 'H') cc++; else cr++;
    }
    return cells;
  }

  let mainDir;
  if (rows.size === 1 && placements.length > 1) mainDir = 'H';
  else if (cols.size === 1 && placements.length > 1) mainDir = 'V';
  else {
    // single tile placed: pick whichever direction actually has neighbors
    const p = placements[0];
    const hSeq = buildSequence(p.row, p.col, 'H');
    const vSeq = buildSequence(p.row, p.col, 'V');
    if (hSeq.length > 1) mainDir = 'H';
    else if (vSeq.length > 1) mainDir = 'V';
    else if (boardEmpty) return { ok: false, reason: 'ต้องวางเบี้ยอย่างน้อยให้ครบสมการ (เช่น 5=5)' };
    else return { ok: false, reason: 'เบี้ยที่วางไม่ได้เชื่อมกับเบี้ยเดิมบนกระดาน' };
  }

  const anchor = placements[0];
  const mainSeq = buildSequence(anchor.row, anchor.col, mainDir);

  // connectivity check (non-first moves must touch existing tiles somewhere)
  const touchesExisting = mainSeq.some(c => !c.isNew) ;

  const sequences = [{ tokens: mainSeq.map(c => c.symbol), cells: mainSeq }];

  // cross-check sequences for every newly placed tile, in the perpendicular direction
  let anyCrossTouches = false;
  for (const p of placements) {
    const crossDir = mainDir === 'H' ? 'V' : 'H';
    const crossSeq = buildSequence(p.row, p.col, crossDir);
    if (crossSeq.length > 1) {
      anyCrossTouches = true;
      sequences.push({ tokens: crossSeq.map(c => c.symbol), cells: crossSeq });
    }
  }

  if (!boardEmpty && !touchesExisting && !anyCrossTouches) {
    return { ok: false, reason: 'เบี้ยที่วางไม่ได้เชื่อมกับเบี้ยเดิมบนกระดาน' };
  }

  for (const seq of sequences) {
    if (!validateEquation(seq.tokens)) {
      return { ok: false, reason: `สมการไม่ถูกต้อง: ${seq.tokens.join(' ')}` };
    }
  }

  // scoring
  let totalScore = 0;
  for (const seq of sequences) {
    let seqSum = 0;
    let eqMultiplier = 1;
    for (const cell of seq.cells) {
      let cellScore = cell.score;
      if (cell.isNew && !specialsDisabled) {
        const cellType = BOARD_LAYOUT[cell.row][cell.col];
        if (cellType === '2P') cellScore *= 2;
        else if (cellType === '3P') cellScore *= 3;
        else if (cellType === '2E') eqMultiplier = Math.max(eqMultiplier, 2);
        else if (cellType === '3E') eqMultiplier = Math.max(eqMultiplier, 3);
      }
      seqSum += cellScore;
    }
    totalScore += seqSum * eqMultiplier;
  }
  totalScore *= scoreMultiplier;

  const gridUpdates = placements.map(p => ({
    row: p.row, col: p.col,
    tile: { symbol: p.displaySymbol, score: p.baseScore, tileId: p.tileId, isBlank: p.isBlank }
  }));

  return { ok: true, score: totalScore, gridUpdates };
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ sessionId } = {}) => {
    const roomCode = generateRoomCode();
    const deal = dealInitialHands();

    rooms[roomCode] = {
      players: [{ sessionId, socketId: socket.id, role: 'P1' }],
      hands: { P1: deal.p1Hand, P2: deal.p2Hand },
      grid: emptyGrid(),
      bag: deal.remainingBag,
      currentTurn: 'P1',
      scores: { P1: 0, P2: 0 },
      timers: { P1: 600, P2: 600 },
      gameOver: null,
      passCount: 0,
      cardHands: { P1: [], P2: [] },
      cardCooldown: { P1: 0, P2: 0 },
      // one-shot effects, consumed by the next relevant turn
      effects: {
        disableSpecialsFor: null,   // role: their next move ignores 2P/3P/2E/3E
        equalsLockedFor: null,      // role: their next move can't place '='
        cellLocked: null,           // { row, col, forRole }
        doubleScoreFor: null        // role: their own next move's equation score x2
      }
    };

    socket.join(roomCode);
    socket.emit('room_created', { roomCode, role: 'P1' });
  });

  socket.on('join_room', ({ roomCode, sessionId } = {}) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms[code];

    if (!room) { socket.emit('error_msg', 'ไม่พบรหัสห้องนี้'); return; }
    if (room.players.length >= 2) { socket.emit('error_msg', 'ห้องนี้เต็มแล้ว'); return; }

    room.players.push({ sessionId, socketId: socket.id, role: 'P2' });
    socket.join(code);

    socket.emit('room_joined', { roomCode: code, role: 'P2' });

    const p1 = room.players.find(p => p.role === 'P1');
    sendState(p1.socketId, room, 'P1');
    sendState(socket.id, room, 'P2');
    io.to(code).emit('game_ready');
  });

  socket.on('rejoin_room', ({ roomCode, sessionId } = {}) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms[code];
    if (!room || !sessionId) { socket.emit('rejoin_failed'); return; }

    const player = findPlayerBySession(room, sessionId);
    if (!player) { socket.emit('rejoin_failed'); return; }

    player.socketId = socket.id;
    socket.join(code);
    sendState(socket.id, room, player.role);
    socket.to(code).emit('opponent_reconnected');
  });

  socket.on('submit_move', ({ roomCode, placements }) => {
    const room = rooms[roomCode];
    if (!room || room.gameOver) return;
    const player = findPlayer(room, socket.id);
    if (!player) return;
    if (room.currentTurn !== player.role) { socket.emit('move_rejected', { reason: 'ยังไม่ถึงตาคุณ' }); return; }

    const hand = room.hands[player.role];
    const enriched = [];
    for (const p of placements || []) {
      const tile = hand.find(t => t && t.id === p.tileId);
      if (!tile) { socket.emit('move_rejected', { reason: 'เบี้ยไม่อยู่ในมือคุณ' }); return; }
      enriched.push({
        row: p.row, col: p.col, tileId: tile.id,
        displaySymbol: p.displaySymbol || tile.symbol,
        baseScore: tile.score, isBlank: tile.symbol === 'BLANK'
      });
    }

    const result = evaluateMove(room, enriched, player.role);
    if (!result.ok) { socket.emit('move_rejected', { reason: result.reason }); return; }

    // apply grid updates
    result.gridUpdates.forEach(u => { room.grid[u.row][u.col] = u.tile; });

    // bingo bonus: used every tile from a full 8-tile hand in one turn
    const usedIds = new Set(enriched.map(e => e.tileId));
    const isBingo = hand.length === 8 && usedIds.size === 8;
    const bonus = isBingo ? BINGO_BONUS : 0;

    // remove used tiles from hand, refill from bag
    room.hands[player.role] = hand.filter(t => t && !usedIds.has(t.id));
    const needRefill = 8 - room.hands[player.role].length;
    const refill = room.bag.splice(0, Math.min(needRefill, room.bag.length));
    room.hands[player.role].push(...refill);

    room.scores[player.role] += result.score + bonus;
    room.passCount = 0;
    consumeEffectsFor(room, player.role);
    advanceTurn(room, otherRole(player.role));

    socket.emit('move_accepted', {
      hand: room.hands[player.role],
      scores: room.scores,
      currentTurn: room.currentTurn,
      bagLeft: room.bag.length,
      gridUpdates: result.gridUpdates,
      gainedScore: result.score,
      bonus,
      card: cardSnapshot(room, player.role)
    });
    socket.to(roomCode).emit('opponent_moved', {
      gridUpdates: result.gridUpdates,
      scores: room.scores,
      currentTurn: room.currentTurn,
      bagLeft: room.bag.length,
      bonus
    });

    checkGameOver(room, roomCode, player.role);
  });

  socket.on('pass_turn', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.gameOver) return;
    const player = findPlayer(room, socket.id);
    if (!player) return;
    if (room.currentTurn !== player.role) { socket.emit('move_rejected', { reason: 'ยังไม่ถึงตาคุณ' }); return; }

    room.passCount = (room.passCount || 0) + 1;
    consumeEffectsFor(room, player.role);
    advanceTurn(room, otherRole(player.role));

    socket.emit('turn_passed', { currentTurn: room.currentTurn, card: cardSnapshot(room, player.role) });
    socket.to(roomCode).emit('opponent_moved', {
      gridUpdates: [], scores: room.scores, currentTurn: room.currentTurn, bagLeft: room.bag.length
    });

    // if both players pass back-to-back, the game is stuck — end it with current scores
    if (room.passCount >= 2) {
      room.gameOver = {
        winner: room.scores.P1 === room.scores.P2 ? null : (room.scores.P1 > room.scores.P2 ? 'P1' : 'P2'),
        scores: room.scores,
        reason: 'both_passed'
      };
      io.to(roomCode).emit('game_over', room.gameOver);
    }
  });

  socket.on('swap_hand', ({ roomCode, tileIds }) => {
    const room = rooms[roomCode];
    if (!room || room.gameOver) return;
    const player = findPlayer(room, socket.id);
    if (!player) return;
    if (room.currentTurn !== player.role) { socket.emit('move_rejected', { reason: 'ยังไม่ถึงตาคุณ' }); return; }
    if (room.bag.length < 1) { socket.emit('move_rejected', { reason: 'ถุงเบี้ยไม่พอให้แลกแล้ว' }); return; }

    const hand = room.hands[player.role];
    const idSet = new Set(tileIds || hand.map(t => t.id));
    const toSwap = hand.filter(t => idSet.has(t.id));
    const keep = hand.filter(t => !idSet.has(t.id));

    room.bag.push(...toSwap);
    room.bag.sort(() => Math.random() - 0.5);

    // try to land on a playable hand (has =, an operator, and a number), same guarantee as the initial deal
    const drawCount = Math.min(toSwap.length, room.bag.length);
    let newHand = keep.concat(room.bag.slice(0, drawCount));
    let attempts = 0;
    while (attempts < 300 && !isValidInitialHand(newHand)) {
      room.bag.sort(() => Math.random() - 0.5);
      newHand = keep.concat(room.bag.slice(0, drawCount));
      attempts++;
    }
    room.bag.splice(0, drawCount);

    room.hands[player.role] = newHand;
    room.passCount = 0;
    consumeEffectsFor(room, player.role);
    advanceTurn(room, otherRole(player.role));

    socket.emit('hand_swapped', {
      hand: room.hands[player.role],
      currentTurn: room.currentTurn,
      bagLeft: room.bag.length,
      card: cardSnapshot(room, player.role)
    });
    socket.to(roomCode).emit('opponent_moved', {
      gridUpdates: [], scores: room.scores, currentTurn: room.currentTurn, bagLeft: room.bag.length
    });
  });

  // --- item cards ---------------------------------------------------------

  socket.on('draw_card', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.gameOver) return;
    const player = findPlayer(room, socket.id);
    if (!player) return;
    if (room.currentTurn !== player.role) { socket.emit('move_rejected', { reason: 'ยังไม่ถึงตาคุณ' }); return; }
    if (room.cardCooldown[player.role] > 0) {
      socket.emit('move_rejected', { reason: `ต้องรออีก ${room.cardCooldown[player.role]} ตาถึงจะสุ่มการ์ดได้อีก` });
      return;
    }
    if (room.cardHands[player.role].length >= MAX_CARDS_IN_HAND) {
      socket.emit('move_rejected', { reason: 'มือการ์ดเต็มแล้ว (สูงสุด 2 ใบ) ใช้การ์ดก่อนถึงจะสุ่มใหม่ได้' });
      return;
    }

    const card = drawRandomCard();
    const instance = { instanceId: `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, cardId: card.id };
    room.cardHands[player.role].push(instance);
    room.cardCooldown[player.role] = CARD_DRAW_COOLDOWN_TURNS;

    // drawing a card uses up the whole turn, like a pass
    room.passCount = 0;
    advanceTurn(room, otherRole(player.role));

    socket.emit('card_drawn', {
      card: { instanceId: instance.instanceId, cardId: card.id, name: card.name, stars: card.stars },
      currentTurn: room.currentTurn,
      cardHand: room.cardHands[player.role],
      cooldown: room.cardCooldown[player.role]
    });
    socket.to(roomCode).emit('opponent_moved', {
      gridUpdates: [], scores: room.scores, currentTurn: room.currentTurn, bagLeft: room.bag.length
    });
    socket.to(roomCode).emit('opponent_drew_card');
  });

  socket.on('use_card', ({ roomCode, instanceId, payload }) => {
    const room = rooms[roomCode];
    if (!room || room.gameOver) return;
    const player = findPlayer(room, socket.id);
    if (!player) return;
    if (room.currentTurn !== player.role) { socket.emit('move_rejected', { reason: 'ใช้การ์ดได้เฉพาะตาตัวเองเท่านั้น' }); return; }

    const cardHand = room.cardHands[player.role];
    const idx = cardHand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) { socket.emit('move_rejected', { reason: 'ไม่พบการ์ดใบนี้ในมือคุณ' }); return; }
    const cardId = cardHand[idx].cardId;
    const opp = otherRole(player.role);

    const result = applyCardEffect(room, player.role, opp, cardId, payload || {});
    if (!result.ok) { socket.emit('move_rejected', { reason: result.reason }); return; }

    cardHand.splice(idx, 1); // consume the card — using a card is a free action, doesn't end the turn

    socket.emit('card_used', { cardId, cardHand: room.cardHands[player.role], effect: result.publicInfo || null, hand: room.hands[player.role] });
    socket.to(roomCode).emit('opponent_used_card', { cardId, effect: result.opponentInfo || null, hand: room.hands[opp] });
  });

  socket.on('resign', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.gameOver) return;
    const player = findPlayer(room, socket.id);
    if (!player) return;

    room.gameOver = {
      winner: otherRole(player.role),
      scores: room.scores,
      reason: 'resign'
    };
    io.to(roomCode).emit('game_over', room.gameOver);
  });

  socket.on('sync_timers', ({ roomCode, timers }) => {
    const room = rooms[roomCode];
    if (!room || !timers) return;
    room.timers = timers;
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      const player = findPlayer(room, socket.id);
      if (player) {
        socket.to(code).emit('opponent_left', 'ผู้เล่นอีกฝ่ายหลุดการเชื่อมต่อ (กำลังรอเชื่อมต่อใหม่...)');
        break;
      }
    }
  });
});

// Applies one card's effect to room state. Returns { ok, reason? , publicInfo?, opponentInfo? }
function applyCardEffect(room, role, opp, cardId, payload) {
  switch (cardId) {
    case 'freeze_time': {
      room.timers[role] += 60;
      return { ok: true, publicInfo: { type: 'freeze_time', timers: room.timers }, opponentInfo: { type: 'freeze_time', timers: room.timers } };
    }
    case 'disable_specials': {
      room.effects.disableSpecialsFor = opp;
      return { ok: true, publicInfo: { type: 'disable_specials' }, opponentInfo: { type: 'disable_specials' } };
    }
    case 'equal_strike': {
      room.effects.equalsLockedFor = opp;
      return { ok: true, publicInfo: { type: 'equal_strike' }, opponentInfo: { type: 'equal_strike' } };
    }
    case 'double_score': {
      room.effects.doubleScoreFor = role;
      return { ok: true, publicInfo: { type: 'double_score' } };
    }
    case 'cell_lock': {
      const { row, col } = payload;
      if (typeof row !== 'number' || typeof col !== 'number' || row < 0 || row > 14 || col < 0 || col > 14) {
        return { ok: false, reason: 'ตำแหน่งช่องไม่ถูกต้อง' };
      }
      if (room.grid[row][col]) return { ok: false, reason: 'ช่องนี้มีเบี้ยอยู่แล้ว เลือกช่องว่างเท่านั้น' };
      room.effects.cellLocked = { row, col, forRole: opp };
      return { ok: true, publicInfo: { type: 'cell_lock', row, col }, opponentInfo: { type: 'cell_lock', row, col } };
    }
    case 'free_blank': {
      const discardId = payload.discardTileId;
      const hand = room.hands[role];
      const idx = hand.findIndex(t => t && t.id === discardId);
      if (idx === -1) return { ok: false, reason: 'ต้องเลือกเบี้ยในมือ 1 ใบเพื่อแลกทิ้ง' };
      const discarded = hand[idx];
      room.bag.push(discarded);
      room.bag.sort(() => Math.random() - 0.5);
      const newBlank = { id: `blank_bonus_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, symbol: 'BLANK', score: 0, type: 'wildcard' };
      hand.splice(idx, 1, newBlank);
      return { ok: true, publicInfo: { type: 'free_blank', hand: room.hands[role] } };
    }
    case 'tile_swap_3': {
      const giveIds = payload.tileIds;
      if (!Array.isArray(giveIds) || giveIds.length !== 3) return { ok: false, reason: 'ต้องเลือกเบี้ยของตัวเอง 3 ใบ' };
      const hand = room.hands[role];
      const oppHand = room.hands[opp];
      const giveTiles = giveIds.map(id => hand.find(t => t && t.id === id)).filter(Boolean);
      if (giveTiles.length !== 3) return { ok: false, reason: 'เบี้ยที่เลือกไม่อยู่ในมือคุณ' };
      if (oppHand.length === 0) return { ok: false, reason: 'คู่แข่งไม่มีเบี้ยให้แลก' };

      const giveIdSet = new Set(giveTiles.map(t => t.id));
      room.hands[role] = hand.filter(t => !giveIdSet.has(t.id));

      const shuffledOpp = [...oppHand].sort(() => Math.random() - 0.5);
      const takeTiles = shuffledOpp.slice(0, Math.min(3, shuffledOpp.length));
      const takeIdSet = new Set(takeTiles.map(t => t.id));
      room.hands[opp] = oppHand.filter(t => !takeIdSet.has(t.id));

      room.hands[role].push(...takeTiles);
      room.hands[opp].push(...giveTiles);

      return { ok: true, publicInfo: { type: 'tile_swap_3', hand: room.hands[role] }, opponentInfo: { type: 'tile_swap_3', hand: room.hands[opp] } };
    }
    case 'swap_rack': {
      const tmp = room.hands[role];
      room.hands[role] = room.hands[opp];
      room.hands[opp] = tmp;
      return { ok: true, publicInfo: { type: 'swap_rack', hand: room.hands[role] }, opponentInfo: { type: 'swap_rack', hand: room.hands[opp] } };
    }
    default:
      return { ok: false, reason: 'ไม่รู้จักการ์ดนี้' };
  }
}

function checkGameOver(room, roomCode, moverRole) {
  const moverHandEmpty = room.hands[moverRole].length === 0;
  if (room.bag.length === 0 && moverHandEmpty) {
    const other = otherRole(moverRole);
    const otherHandValue = room.hands[other].reduce((s, t) => s + t.score, 0);
    room.scores[moverRole] += otherHandValue;
    room.scores[other] -= otherHandValue;
    room.gameOver = {
      winner: room.scores.P1 === room.scores.P2 ? null : (room.scores.P1 > room.scores.P2 ? 'P1' : 'P2'),
      scores: room.scores
    };
    io.to(roomCode).emit('game_over', room.gameOver);
  }
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
