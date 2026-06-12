FROM node:22-bookworm-slim

# Build tools required by better-sqlite3 (native addon)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies (builds native modules inside the container)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Ensure data directory exists and is owned by the non-root user
RUN mkdir -p /app/data && chown -R node:node /app

EXPOSE 3000

USER node

CMD ["node", "server/index.js"]
