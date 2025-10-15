const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const prisma = require('./prismaClient');
const { scheduleAutoStart } = require('./gameService');

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------
// HTTP SERVER + SOCKET.IO
// -------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// -------------------------
// REST API ROUTES
// -------------------------

// 🧍 Get all users
app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// 🎡 Get all wheels
app.get('/api/wheels', async (req, res) => {
  const wheels = await prisma.wheel.findMany({
    include: { joins: true },
  });
  res.json(wheels);
});

// 👥 Get participants of a wheel
app.get('/api/wheels/:id/participants', async (req, res) => {
  const id = Number(req.params.id);
  const parts = await prisma.join.findMany({
    where: { wheelId: id },
    include: { user: true },
  });
  res.json(
    parts.map((p) => ({
      id: p.userId,
      username: p.user.username,
      eliminated_at: p.eliminatedAt,
    }))
  );
});

// 🛠 Create wheel (admin/host)
app.post('/api/wheels', async (req, res) => {
  const { owner_id, entry_fee } = req.body;
  if (!owner_id) return res.status(400).send('owner_id required');

  // Only one pending wheel allowed at a time
  const active = await prisma.wheel.findFirst({ where: { status: 'PENDING' } });
  if (active) return res.status(400).send('Another wheel is already pending');

  // Create wheel
  const wheel = await prisma.wheel.create({
    data: {
      ownerId: owner_id,
      entryFee: entry_fee,
      status: 'PENDING',
    },
  });

  // Auto-start in 3 minutes
  scheduleAutoStart(io, wheel.id, 3 * 60 * 1000);

  res.json(wheel);
});

// 🎮 Join wheel
app.post('/api/wheels/:id/join', async (req, res) => {
  const wheelId = Number(req.params.id);
  const { user_id } = req.body;
  if (!user_id) return res.status(400).send('user_id required');

  const wheel = await prisma.wheel.findUnique({ where: { id: wheelId } });
  if (!wheel) return res.status(404).send('Wheel not found');
  if (wheel.status !== 'PENDING')
    return res.status(400).send('Wheel not open for joins');

  const entryFee = wheel.entryFee;

  try {
    await prisma.$transaction(async (tx) => {
      // Check if user has enough coins
      const user = await tx.user.findUnique({ where: { id: user_id } });
      if (!user || user.coins < entryFee)
        throw new Error('Insufficient balance');

      // Deduct entry fee
      await tx.user.update({
        where: { id: user_id },
        data: { coins: { decrement: entryFee } },
      });

      // Record join
      await tx.join.create({
        data: { userId: user_id, wheelId },
      });
    });

    io.emit('wheel:player_joined', { wheelId, userId: user_id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// -------------------------
// SOCKET.IO HANDLERS
// -------------------------
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('wheel:create', async (data, cb) => {
    try {
      const { hostId, title, segments, entryFee, maxPlayers } = data;
      const wheel = await prisma.wheel.create({
        data: {
          title,
          hostId,
          entryFee,
          maxPlayers,
          status: 'PENDING',
          segments,
        },
      });
      scheduleAutoStart(io, wheel.id, 3 * 60 * 1000);
      io.emit('wheel:created', wheel);
      cb({ success: true });
    } catch (err) {
      cb({ success: false, message: err.message });
    }
  });

  socket.on('wheel:join', async ({ userId, wheelId }, cb) => {
    try {
      const wheel = await prisma.wheel.findUnique({ where: { id: wheelId } });
      if (!wheel) return cb({ success: false, message: 'Wheel not found' });

      await prisma.join.create({ data: { userId, wheelId } });
      io.emit('wheel:player_joined', { wheelId, userId });
      cb({ success: true });
    } catch (err) {
      cb({ success: false, message: err.message });
    }
  });

  socket.on('wheel:start', async ({ wheelId }, cb) => {
    try {
      await prisma.wheel.update({
        where: { id: wheelId },
        data: { status: 'RUNNING', startsAt: new Date() },
      });
      io.emit('wheel:started', { wheelId });
      cb({ success: true });
    } catch (err) {
      cb({ success: false, message: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// -------------------------
// SERVER START
// -------------------------
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});
