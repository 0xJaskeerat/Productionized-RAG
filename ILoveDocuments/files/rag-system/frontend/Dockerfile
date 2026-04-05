# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json .
RUN npm install

COPY . .
RUN npm run build
# Output: /app/dist/


# ── Stage 2: Serve via Nginx ──────────────────────────────────────────────────
FROM nginx:alpine

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
