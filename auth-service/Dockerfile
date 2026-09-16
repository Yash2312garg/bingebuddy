# ==========================================
# BASE STAGE
# ==========================================
FROM node:20-alpine AS base
# Install necessary Alpine packages (curl for healthchecks)
RUN apk add --no-cache curl
WORKDIR /usr/src/app
# Copy package files first for better layer caching
COPY package*.json ./

# ==========================================
# DEVELOPMENT STAGE
# ==========================================
FROM base AS development
# Install all dependencies (including devDependencies like TypeScript, Nodemon)
RUN npm ci
# Do not copy source code here! We use Docker volume mounts in docker-compose for live-reloading.
# Start via the dev script (e.g., nodemon or ts-node-dev)
CMD ["npm", "run", "dev"]

# ==========================================
# BUILD STAGE
# ==========================================
FROM base AS build
# Install all dependencies to compile TypeScript
RUN npm ci
# Copy all source code
COPY . .
# Compile TypeScript to JavaScript (assuming you have a "build" script in package.json)
RUN npm run build

# ==========================================
# PRODUCTION STAGE
# ==========================================
FROM base AS production
# Set Node environment to production
ENV NODE_ENV=production

# Install ONLY production dependencies to keep the image small and secure
RUN npm ci --only=production && npm cache clean --force

# Copy the compiled output from the build stage (assuming it outputs to /dist)
COPY --from=build /usr/src/app/dist ./dist

# Switch to the non-root 'node' user for security
USER node

# Start the compiled application
CMD ["node", "dist/server.js"]