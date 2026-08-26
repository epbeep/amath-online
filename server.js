const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// ให้บริการไฟล์ Static HTML/JS จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, 'public')));

// หน่วยความจำเก็บสถานะห้องเกม
const rooms = {};

// สร้าง รหัสห้องสุ่ม 6 หลัก
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('ผู้เล่นเชื่อมต่อ:', socket.id);

  // 1. สร้างห้องใหม่ (Create Room)
  socket.on('create_room', () => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      players: [{ id: socket.id, role: 'P1', name: 'Player 1' }],
      currentTurn: 'P1',
      boardState: Array(15).fill(null).map(() => Array(15).fill(null)),
      scores: { P1: 0, P2: 0 },
      isGameStarted: false
    };

    socket.join(roomCode);
    socket.emit('room_created', { roomCode, role: 'P1' });
    console.log(`ห้องถูกสร้าง: ${roomCode}`);
  });

  // 2. เข้าร่วมห้อง (Join Room)
  socket.on('join_room', (roomCode) => {
    const code = roomCode.trim().toUpperCase();
    const room = rooms[code];

    if (!room) {
      socket.emit('error_msg', 'ไม่พบรหัสห้องนี้');
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error_msg', 'ห้องนี้เต็มแล้ว');
      return;
    }

    room.players.push({ id: socket.id, role: 'P2', name: 'Player 2' });
    room.isGameStarted = true;
    socket.join(code);

    socket.emit('room_joined', { roomCode: code, role: 'P2' });

    // แจ้งเตือนผู้เล่นทั้งคู่ว่าเกมเริ่มแล้ว!
    io.to(code).emit('game_start', {
      currentTurn: room.currentTurn,
      players: room.players
    });
    console.log(`ผู้เล่น P2 เข้าร่วมห้อง: ${code}`);
  });

  // 3. ส่งคำตอบ/วางสมการ (Submit Move)
  socket.on('submit_move', ({ roomCode, placedTiles, fullCells, newScore, nextTurn }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // อัปเดตกระดานและคะแนนฝั่ง Server
    room.scores[nextTurn === 'P2' ? 'P1' : 'P2'] = newScore;
    room.currentTurn = nextTurn;

    // ส่งข้อมูลกระดานที่อัปเดตไปให้ผู้เล่นอีกคนแบบ Real-time!
    socket.to(roomCode).emit('opponent_moved', {
      placedTiles,
      fullCells,
      newScore,
      currentTurn: nextTurn
    });
  });

  // 4. ผู้เล่นตัดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('ผู้เล่นตัดการเชื่อมต่อ:', socket.id);
    for (const code in rooms) {
      const room = rooms[code];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        io.to(code).emit('opponent_left', 'ผู้เล่นอีกฝ่ายออกจากเกมแล้ว');
        delete rooms[code];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 A-Math Server กำลังทำงานที่ http://localhost:${PORT}`);
});
