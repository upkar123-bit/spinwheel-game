# ==========================
# 1️⃣ Base Image
# ==========================
FROM node:18-alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Install dependencies for bcrypt & OpenSSL
RUN apk add --no-cache python3 make g++ openssl libc6-compat

# Copy package files first (for Docker layer caching)
COPY package*.json ./

# Install dependencies (use npm ci for clean install)
RUN npm ci

# Copy the rest of the backend code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose backend port
EXPOSE 4000

# Set NODE_ENV for production
ENV NODE_ENV=production

# ==========================
# 2️⃣ Run Command
# ==========================
# Start the backend server
CMD ["npm", "run", "start"]

