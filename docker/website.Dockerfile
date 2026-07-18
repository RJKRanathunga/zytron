# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first for Docker caching
COPY src/website/package*.json ./
RUN npm ci

# Copy website source
COPY src/website/ ./

# API URL embedded during the Vite build
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build


# Production web server
FROM caddy:2-alpine

WORKDIR /app

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /app/dist

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]