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

function createShuffledBag() {
  const bag = [];
  let idx = 0;
  A_MATH_CONFIG.forEach(item => {
    for (let i = 0; i < item.count; i++) {
      bag.push({ id: `t_${idx++}`, symbol: item.symbol, score: item.score, type: item.type });
    }
  });
  return bag.sort(() => Math.random() - 0.5);
}

function isValidInitialHand(hand) {
  const hasEqual = hand.some(t => t.symbol === '=' || t.symbol === 'BLANK');
  const hasOperator = hand.some(t => ['+', '-', 'x', '÷', '+/-', 'x/÷', 'BLANK'].includes(t.symbol));
  const hasNumber = hand.some(t => t.type === 'number' || t.symbol === 'BLANK');
  return hasEqual && hasOperator && hasNumber;
}

function dealInitialHands() {
  let bag = createShuffledBag();
  let p1Hand = [], p2Hand = [];

  let attempts = 0;
  while (attempts < 100) {
    p1Hand = bag.slice(0, 8);
    if (isValidInitialHand(p1Hand)) { bag = bag.slice(8); break; }
    bag.sort(() => Math.random() - 0.5);
    attempts++;
  }

  attempts = 0;
  while (attempts < 100) {
    p2Hand = bag.slice(0, 8);
    if (isValidInitialHand(p2Hand)) { bag = bag.slice(8); break; }
    bag.sort(() => Math.random() - 0.5);
    attempts++;
  }

  return { p1Hand, p2Hand, remainingBag: bag };
}

const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  socket.on('create_room', () => {
    const roomCode = generateRoomCode();
    const deal = dealInitialHands();

    rooms[roomCode] = {
      players: [{ id: socket.id, role: 'P1', hand: deal.p1Hand }],
      p2Hand: deal.p2Hand,
      bag: deal.remainingBag,
      currentTurn: 'P1',
      scores: { P1: 0, P2: 0 },
      timers: { P1: 600, P2: 600 }
    };

    socket.join(roomCode);
    socket.emit('room_created', { roomCode, role: 'P1' });
  });

  socket.on('join_room', (roomCode) => {
    const code = roomCode.trim().toUpperCase();
    const room = rooms[code];

    if (!room) { socket.emit('error_msg', 'ไม่พบรหัสห้องนี้'); return; }
    if (room.players.length >= 2) { socket.emit('error_msg', 'ห้องนี้เต็มแล้ว'); return; }

    const p2Data = { id: socket.id, role: 'P2', hand: room.p2Hand };
    room.players.push(p2Data);
    socket.join(code);

    socket.emit('room_joined', { roomCode: code, role: 'P2' });

    const p1Player = room.players.find(p => p.role === 'P1');
    io.to(p1Player.id).emit('game_start', { currentTurn: 'P1', hand: p1Player.hand, roomTimers: room.timers, bagLeft: room.bag.length });
    io.to(p2Data.id).emit('game_start', { currentTurn: 'P1', hand: p2Data.hand, roomTimers: room.timers, bagLeft: room.bag.length });
  });

  socket.on('submit_move', ({ roomCode, placedTiles, fullCells, newScore, nextTurn, timers, remainingHandCount }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (timers) room.timers = timers;
    const currentRole = nextTurn === 'P2' ? 'P1' : 'P2';
    room.scores[currentRole] = newScore;
    room.currentTurn = nextTurn;

    // เติมเบี้ยจั่วคืนอย่างปลอดภัย (เช็กถุงก่อน)
    const needRefill = 8 - remainingHandCount;
    const refilledTiles = room.bag.length >= needRefill ? room.bag.splice(0, needRefill) : room.bag.splice(0, room.bag.length);

    socket.emit('refill_hand', { newTiles: refilledTiles, bagLeft: room.bag.length });

    socket.to(roomCode).emit('opponent_moved', {
      placedTiles, fullCells, newScore, currentTurn: nextTurn, roomTimers: room.timers, bagLeft: room.bag.length
    });
  });

  socket.on('swap_hand', ({ roomCode, oldHand, nextTurn, timers }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (timers) room.timers = timers;

    // เคลียร์ค่าตัวแประบุสถานะเบี้ยเดิมก่อนคืนเข้าถุง
    const cleanOldHand = oldHand.filter(Boolean).map(t => ({
      id: t.id, symbol: t.symbol, score: t.score, type: t.type
    }));

    room.bag.push(...cleanOldHand);
    room.bag.sort(() => Math.random() - 0.5);

    const needCount = Math.min(8, room.bag.length);
    const newHand = room.bag.splice(0, needCount);
    room.currentTurn = nextTurn;

    socket.emit('hand_swapped', { newHand, currentTurn: nextTurn, roomTimers: room.timers, bagLeft: room.bag.length });

    socket.to(roomCode).emit('opponent_moved', {
      placedTiles: [], fullCells: [], newScore: room.scores[nextTurn === 'P1' ? 'P2' : 'P1'], currentTurn: nextTurn, roomTimers: room.timers, bagLeft: room.bag.length
    });
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players.some(p => p.id === socket.id)) {
        io.to(code).emit('opponent_left', 'ผู้เล่นอีกฝ่ายออกจากเกมแล้ว');
        delete rooms[code];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
