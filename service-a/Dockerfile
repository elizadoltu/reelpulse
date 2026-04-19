FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY service-a/package*.json ./service-a/
COPY tsconfig.base.json ./

RUN npm ci --workspace=service-a

COPY service-a/ ./service-a/

RUN npm run build --workspace=service-a

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/service-a/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/service-a/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
