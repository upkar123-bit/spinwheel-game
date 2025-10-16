import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import cors from "cors";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // you can replace this with your frontend domain later
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ===== Root =====
app.get("/", (req, res) => {
  res.send("🎯 Spinwheel Backend is running with real-time support!");
});

// ===== USERS =====
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    include: { joins: true, spins: true, transactions: true },
  });
  res.json(users);
});

app.get("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    include: { joins: true, spins: true, transactions: true },
  });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

app.post("/users", async (req, res) => {
  const { username, coins } = req.body;
  const user = await prisma.user.create({ data: { username, coins } });
  res.status(201).json(user);
});

// ===== WHEELS =====
app.get("/wheels", async (req, res) => {
  const wheels = await prisma.wheel.findMany({ include: { joins: true, spins: true } });
  res.json(wheels);
});

app.get("/wheels/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const wheel = await prisma.wheel.findUnique({
    where: { id },
    include: { joins: true, spins: true },
  });
  if (!wheel) return res.status(404).json({ message: "Wheel not found" });
  res.json(wheel);
});

app.post("/wheels", async (req, res) => {
  const { ownerId, entry_fee, status, startsAt } = req.body;
  const wheel = await prisma.wheel.create({
    data: { ownerId, entry_fee, status, startsAt },
  });
  res.status(201).json(wheel);
});

// ===== JOINS =====
app.get("/joins", async (req, res) => {
  const joins = await prisma.join.findMany({ include: { user: true, wheel: true } });
  res.json(joins);
});

app.post("/joins", async (req, res) => {
  const { userId, wheelId } = req.body;
  const join = await prisma.join.create({
    data: { userId, wheelId },
  });
  res.status(201).json(join);
});

// ===== SPINS =====
app.get("/spins", async (req, res) => {
  const spins = await prisma.spin.findMany({ include: { wheel: true } });
  res.json(spins);
});

app.post("/spins", async (req, res) => {
  const { wheelId, winnerId, amount } = req.body;
  const spin = await prisma.spin.create({
    data: { wheelId, winnerId, amount },
  });
  res.status(201).json(spin);
});

// ===== TRANSACTIONS =====
app.get("/transactions", async (req, res) => {
  const transactions = await prisma.transaction.findMany({ include: { user: true } });
  res.json(transactions);
});

app.post("/transactions", async (req, res) => {
  const { userId, amount, kind, meta } = req.body;
  const transaction = await prisma.transaction.create({
    data: { userId, amount, kind, meta },
  });
  res.status(201).json(transaction);
});

// ===== SOCKET.IO REAL-TIME EVENTS =====
io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  // Join a wheel room
  socket.on("joinWheel", ({ wheelId, userId }) => {
    socket.join(`wheel_${wheelId}`);
    console.log(`User ${userId} joined wheel ${wheelId}`);
    io.to(`wheel_${wheelId}`).emit("userJoined", { userId });
  });

  // Start spin
  socket.on("startSpin", async ({ wheelId }) => {
    console.log(`Wheel ${wheelId} spinning...`);

    // Fetch all participants from DB
    const participants = await prisma.join.findMany({
      where: { wheelId },
      include: { user: true },
    });

    if (participants.length === 0) return;

    // Pick random winner
    const randomIndex = Math.floor(Math.random() * participants.length);
    const winner = participants[randomIndex].user;

    // Create spin + transaction
    const spin = await prisma.spin.create({
      data: { wheelId, winnerId: winner.id, amount: 100 }, // default prize 100
    });

    await prisma.transaction.create({
      data: { userId: winner.id, amount: 100, kind: "CREDIT", meta: "Wheel Win" },
    });

    // Broadcast to everyone in the room
    io.to(`wheel_${wheelId}`).emit("spinResult", { wheelId, winner });
  });

  socket.on("disconnect", () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

// ===== Start server =====
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} with real-time spin support`);
});


