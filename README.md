# Real-Time Multiplayer Spin Wheel Game

A full-stack, real-time multiplayer Spin Wheel game where users can create wheels, join games by paying an entry fee, compete for prize pools, and track coins in real-time. Built with **React + Vite** for frontend, **Node.js + Express + Socket.IO** for backend, and **PostgreSQL** for data storage.

---

## Table of Contents
1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Setup & Run](#setup--run)
5. [Environment Variables](#environment-variables)
6. [Usage](#usage)
7. [License](#license)

---

## Features

- **Spin Wheel Lifecycle**
  - Admins can create a spin wheel.
  - Only one active wheel at a time.
  - Users can join by paying an entry fee.
  - Wheels auto-start after 3 minutes or manually by admin.
  - Minimum 3 participants required; otherwise auto-abort with refund.
  - Random elimination sequence every 7 seconds.
  - Last remaining user wins the prize pool.

- **Coin Distribution System**
  - Configurable entry fee distribution:
    - Winner Pool
    - Admin Pool
    - App Pool
  - Atomic coin operations to handle concurrent updates safely.
  - Transaction history stored in database.

- **Real-Time Updates**
  - Socket.IO powered live updates for all participants.
  - Users see wheel status, participants, and eliminations in real-time.

---

## Tech Stack

- **Frontend:** React, Vite, Socket.IO Client, Axios  
- **Backend:** Node.js, Express, Socket.IO Server, Prisma ORM  
- **Database:** PostgreSQL  
- **Containerization:** Docker & Docker Compose  

---

## Project Structure

