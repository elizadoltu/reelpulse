FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY service-a/package*.json ./service-a/
COPY cf-analytics/package*.json ./cf-analytics/
COPY cf-review-analyzer/package*.json ./cf-review-analyzer/
COPY notification-service/package*.json ./notification-service/
COPY frontend/package*.json ./frontend/
COPY tsconfig.base.json ./
COPY proto/ ./proto/

RUN npm ci --ignore-scripts

COPY notification-service/ ./notification-service/

RUN npm run build --workspace=notification-service

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/notification-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/notification-service/dist ./dist

EXPOSE 3002

CMD ["node", "dist/index.js"]
