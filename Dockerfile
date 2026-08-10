# syntax=docker/dockerfile:1
#
# node:20-alpine (musl libc) can't load @temporalio/core-bridge's native
# addon, which is only published for glibc - hence node:20-slim (Debian).

# ---- deps: install full deps (incl. dev) for build ----
FROM node:20-slim AS deps
WORKDIR /app
# bcrypt has a native addon; Debian needs the toolchain to build it
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile TypeScript ----
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- prod-deps: install production-only deps ----
FROM node:20-slim AS prod-deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runner: minimal final image ----
FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN groupadd -r app && useradd -r -g app app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./

USER app

EXPOSE 3000

CMD ["node", "build/server.js"]
