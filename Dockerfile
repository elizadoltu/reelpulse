FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY service-a/package*.json ./service-a/
COPY cf-analytics/package*.json ./cf-analytics/
COPY cf-review-analyzer/package*.json ./cf-review-analyzer/
COPY notification-service/package*.json ./notification-service/
COPY frontend/package*.json ./frontend/
COPY tsconfig.base.json ./

RUN npm ci --ignore-scripts

COPY service-a/ ./service-a/

RUN npm run build --workspace=service-a

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/service-a/package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/service-a/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
