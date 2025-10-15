// src/index.js

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import dependencies
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma and Express
const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Example route: Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Example route: Create a wheel
app.post('/wheels', async (req, res) => {
  const { ownerId, entry_fee } = req.body;
  try {
    const wheel = await prisma.wheel.create({
      data: {
        ownerId,
        entry_fee,
      },
    });
    res.json(wheel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

