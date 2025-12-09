# 1. Base image
FROM node:20-alpine AS base

# 2. Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Skip downloading Chrome binary locally to save time/bandwidth
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm ci

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 4. Runner (Production)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# --- FIX: Install Chromium for Alpine ---
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer where to find the installed Chrome
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder (create it if missing to avoid errors)
COPY --from=builder /app/public ./public

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Don't switch to nextjs user yet - we need root to fix permissions at runtime
# Create data directory
RUN mkdir -p /app/data

# Create entrypoint script to fix permissions at runtime
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'chown -R nextjs:nodejs /app/data 2>/dev/null || true' >> /entrypoint.sh && \
    echo 'exec su-exec nextjs:nodejs node server.js' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Install su-exec for safer user switching
RUN apk add --no-cache su-exec

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use entrypoint script to fix permissions before starting
CMD ["/entrypoint.sh"]