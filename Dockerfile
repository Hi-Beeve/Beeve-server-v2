# =========================================
# Build Stage
# =========================================
FROM node:20-alpine AS builder

WORKDIR /app

# ✅ OpenSSL 설치 (Alpine에서 Prisma 실행에 필요)
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# =========================================
# Production Stage
# =========================================
FROM node:20-alpine

WORKDIR /app

# ✅ OpenSSL 설치 (런타임에도 필요!)
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "dist/src/main.js"]