# Stage 1: Build Angular app
FROM node:20-alpine AS angular-build

WORKDIR /app/ngdiagram-app
COPY ngdiagram-app/package*.json ./
RUN npm ci
COPY ngdiagram-app/ ./
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

# Copy mock server and data files
COPY mock-server.js graph-mock.json package.json ./

# Copy Angular build output into public/ for static serving
COPY --from=angular-build /app/ngdiagram-app/dist/ngdiagram-app/browser ./public

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_DIR=/app/public

CMD ["node", "mock-server.js"]
