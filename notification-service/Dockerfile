# syntax=docker/dockerfile:1
# ========================================
# Optimized Multi-Stage Dockerfile for Notification Microservice
# = :::: Node.js + TypeScript ::::
# ========================================

ARG NODE_VERSION=22.13.1
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /usr/src/app

# ========================================
# 1. Production Dependencies Stage
# ========================================
FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --omit=dev && \
    npm cache clean --force

# ========================================
# 2. Build Dependencies Stage (Dev + Build Tools)
# ========================================
FROM base AS build-deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund && \
    npm cache clean --force

# ========================================
# 3. Build Stage (Compilation)
# ========================================
FROM build-deps AS build
COPY --chown=nodejs:nodejs . .
RUN npm run build

# ========================================
# 4. Development Stage
# ========================================
FROM build-deps AS development
ENV NODE_ENV=development \
    NPM_CONFIG_LOGLEVEL=warn

COPY --chown=nodejs:nodejs . .
RUN chmod -R 755 /usr/src/app

USER nodejs
EXPOSE 3001 9229

# Uses the dev script defined in package.json
CMD ["npm", "run", "dev"]

# ========================================
# 5. Production Stage
# ========================================
FROM base AS production
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024 --no-warnings" \
    NPM_CONFIG_LOGLEVEL=silent

COPY --from=deps --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /usr/src/app/package*.json ./
COPY --from=build --chown=nodejs:nodejs /usr/src/app/dist ./dist

USER nodejs
EXPOSE 3001

# Points to the compiled TypeScript entry point
CMD ["node", "dist/server.js"]