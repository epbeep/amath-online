const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// สำหรับ Express 5.x: ส่ง index.html สำหรับทุก request ที่ไม่ตรงกับ static file
app.use((req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// คลังกำหนดสเปกเบี้ย A-Math ทั้งหมด 100 ชิ้น
const A_MATH_CONFIG = [
  { symbol: "0", count: 5, score: 1 }, { symbol: "1", count: 6, score: 1 },
  { symbol: "2", count: 6, score: 1 }, { symbol: "3", count: 5, score: 1 },
  { symbol: "4", count: 5, score: 2 }, { symbol: "5", count: 4, score: 2 },
  { symbol: "6", count: 4, score: 2 }, { symbol: "7", count: 4, score: 2 },
  { symbol: "8", count: 4, score: 2 }, { symbol: "9", count: 4, score: 2 },
  { symbol: "10", count: 2, score: 3 }, { symbol: "11", count: 1, score: 4 },
  { symbol: "12", count: 2, score: 3 }, { symbol: "13", count: 1, score: 6 },
  { symbol: "14", count: 1, score: 4 }, { symbol: "15", count: 1, score: 4 },
  { symbol: "16", count: 1, score: 4 }, { symbol: "17", count: 1, score: 6 },
  { symbol: "18", count: 1, score: 4 }, { symbol: "19", count: 1, score: 7 },
  { symbol: "20", count: 1, score: 5 }, { symbol: "+", count: 4, score: 2 },
  { symbol: "-", count: 4, score: 2 }, { symbol: "+/-", count: 5, score: 1 },
  { symbol: "*", count: 4, score: 2 }, { symbol: "/", count: 4, score: 2 },
  { symbol: "*/", count: 4, score: 1 }, { symbol: "=", count: 11, score: 1 },
  { symbol: "BLANK", count: 4, score: 0 }
];

function createShuffledBag() {
  const bag = [];
  let idx = 0;
  A_MATH_CONFIG.forEach(item => {
    for (let i = 0; i < item.count; i++) {
      bag.push({ id: `t_${idx++}`, symbol: item.symbol, score: item.score });
    }
  });
  return bag.sort(() => Math.random() - 0.5);
}

const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  socket.on('create_room', () => {
    const roomCode = generateRoomCode();
    const bag = createShuffledBag();
    
    const p1Hand = bag.splice(0, 8);
    const p2Hand = bag.splice(0, 8);

    rooms[roomCode] = {
      players: [{ id: socket.id, role: 'P1', hand: p1Hand }],
      p2Hand: p2Hand,
      bag: bag,
      currentTurn: 'P1',
      scores: { P1: 0, P2: 0 }
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
    io.to(p1Player.id).emit('game_start', { currentTurn: 'P1', hand: p1Player.hand });
    io.to(p2Data.id).emit('game_start', { currentTurn: 'P1', hand: p2Data.hand });
  });

  socket.on('submit_move', ({ roomCode, placedTiles, fullCells, newScore, nextTurn }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.scores[nextTurn === 'P2' ? 'P1' : 'P2'] = newScore;
    room.currentTurn = nextTurn;

    socket.to(roomCode).emit('opponent_moved', {
      placedTiles, fullCells, newScore, currentTurn: nextTurn
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
