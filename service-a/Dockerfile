# Build context is the monorepo root: docker build -f service-a/Dockerfile .
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY service-a/package.json service-a/tsconfig.json service-a/tsconfig.build.json ./service-a/
COPY service-a/src ./service-a/src

RUN npm ci --workspace=service-a --ignore-scripts
RUN npm run build --workspace=service-a

FROM node:20-alpine
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json /app/tsconfig.base.json ./
COPY --from=builder /app/service-a/package.json ./service-a/

RUN npm ci --workspace=service-a --omit=dev --ignore-scripts

COPY --from=builder /app/service-a/dist ./service-a/dist

USER node
EXPOSE 3001
EXPOSE 50051

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "service-a/dist/src/index.js"]
