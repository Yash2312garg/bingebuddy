# syntax=docker/dockerfile:1
# ========================================
# Optimized Multi-Stage Dockerfile for BingeBuddy
# = :::: Node.js + TypeScript + PostgreSQL + Redis ::::
# ========================================

ARG NODE_VERSION=22.13.1
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Create non-root user for security (Essential for Production)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /usr/src/app

# ========================================
# 1. Production Dependencies Stage
# ========================================
FROM base AS deps
COPY package*.json ./
# Install only production-ready modules
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --omit=dev && \
    npm cache clean --force

# ========================================
# 2. Build Dependencies Stage (Dev + Build Tools)
# ========================================
FROM base AS build-deps
COPY package*.json ./
# Install everything (including TypeScript and Nodemon)
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund && \
    npm cache clean --force

# ========================================
# 3. Build Stage (Compilation)
# ========================================
FROM build-deps AS build
COPY --chown=nodejs:nodejs . .
# Transpile TS to JS (Generates /dist folder)
RUN npm run build

# ========================================
# 4. Development Stage (Target for app-dev)
# ========================================
FROM build-deps AS development
ENV NODE_ENV=development \
    NPM_CONFIG_LOGLEVEL=warn

COPY --chown=nodejs:nodejs . .

# Ensure the app can write to its own directory if needed (e.g. for logs)
RUN chmod -R 755 /usr/src/app

USER nodejs
EXPOSE 3000 9229
# Uses your package.json 'dev' script: "nodemon --exec ts-node src/index.ts"
CMD ["npm", "run", "dev"]

# ========================================
# 5. Production Stage (Target for app-prod)
# ========================================
FROM base AS production
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024 --no-warnings" \
    NPM_CONFIG_LOGLEVEL=silent

# Copy only what is strictly necessary for the app to run
COPY --from=deps --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /usr/src/app/package*.json ./
COPY --from=build --chown=nodejs:nodejs /usr/src/app/dist ./dist

USER nodejs
EXPOSE 3000

# Fixed: Points to your actual compiled entry point
CMD ["node", "dist/index.js"]