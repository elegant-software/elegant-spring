# Stage 1: Build TypeScript
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY data/ ./data/

EXPOSE 3100
ENV NODE_ENV=production
ENV PORT=3100
ENV HOST=0.0.0.0

CMD ["node", "dist/server.js"]
