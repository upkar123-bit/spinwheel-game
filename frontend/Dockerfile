# ==========================
# 1️⃣ Build Stage
# ==========================
FROM node:18-alpine AS build

# Set working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy all frontend source code
COPY . .

# Build the production-ready app
RUN npm run build

# ==========================
# 2️⃣ Production Stage (Serve built files)
# ==========================
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Copy nginx config (optional: enable SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

