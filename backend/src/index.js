import dotenv from "dotenv";
dotenv.config();  // Load variables from .env

require('dotenv').config();
const express = require('express');
const http = require('http');
const { createClient } = require('redis');
const socketio = require('socket.io');
const socketHandlers = require('./socketHandlers');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new socketio.Server(server, { cors: { origin: '*' } });

const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
redisClient.connect().then(() => console.log('redis connected')).catch(console.error);

socketHandlers(io, redisClient);

// simple HTTP routes for fetching wheels
const prisma = require('./prismaClient');
app.get('/wheels', async (req, res) => {
  const wheels = await prisma.wheel.findMany({ include: { joins: true }});
  res.json(wheels);
});

const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`Server running on ${port}`));
