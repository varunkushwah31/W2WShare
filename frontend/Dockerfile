# syntax=docker/dockerfile:1.7
# ============================================================================
# Stage 1: Build Frontend SPA (React 19 + TypeScript + Vite + Tailwind CSS)
# ============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency manifests first for optimal layer caching
COPY package.json package-lock.json ./

# Install dependencies deterministically
RUN npm ci

# Copy application source code
COPY . .

# Build production bundle with TypeScript typecheck and Vite minification
RUN npm run build

# ============================================================================
# Stage 2: Minimal Production Nginx Web Server & Reverse Proxy
# ============================================================================
FROM nginx:alpine AS runner

# Remove default Nginx website configuration and static files
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration with reverse proxy for /api and /ws
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port 80
EXPOSE 80

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
