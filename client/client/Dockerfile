# syntax=docker/dockerfile:1
# ========================================
# Optimized Multi-Stage Dockerfile for React Client
# ========================================

ARG NODE_VERSION=22.13.1
FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /usr/src/app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /usr/src/app

# ========================================
# 1. Dependencies Stage
# ========================================
FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund && \
    npm cache clean --force

# ========================================
# 2. Development Stage (Vite Dev Server with HMR)
# ========================================
FROM base AS development
ENV NODE_ENV=development

COPY --from=deps --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Ensure nodejs user owns node_modules for Storybook/Vite runtime caches (.cache, .vite)
RUN chown -R nodejs:nodejs /usr/src/app/node_modules

USER nodejs
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]

# ========================================
# 3. Build Stage (Static Assets Compilation)
# ========================================
FROM deps AS build
COPY --chown=nodejs:nodejs . .
RUN npm run build

# ========================================
# 4. Production Stage (Nginx Web Server)
# ========================================
FROM nginx:1.27-alpine AS production
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
