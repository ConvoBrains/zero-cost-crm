# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup -S crm && adduser -S crm -G crm

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install tsx@^4.20.5

COPY --from=builder /app/dist ./dist
COPY server ./server
COPY sql ./sql
COPY scripts ./scripts

USER crm

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

CMD ["npx", "tsx", "server/index.ts"]
