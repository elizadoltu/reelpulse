FROM node:21-bookworm-slim AS builder
RUN apt-get update && apt-get upgrade -y
WORKDIR /build

COPY package*.json ./
COPY service-a/package*.json service-a/tsconfig.json ./service-a/
COPY cf-analytics/package*.json ./cf-analytics/
COPY cf-review-analyzer/package*.json ./cf-review-analyzer/
COPY notification-service/package*.json ./notification-service/
COPY frontend/package*.json ./frontend/
COPY tsconfig.base.json ./

COPY service-a/ ./service-a/

RUN npm ci --ignore-scripts
RUN npm run build --workspace=service-a

FROM node:21-bookworm-slim AS runner
RUN apt-get update && apt-get upgrade -y && apt-get install -y dumb-init
ENV HOME=/home/app
ENV APP_HOME=$HOME/node/
WORKDIR $APP_HOME
COPY --chown=node:node service-a/ $APP_HOME
COPY --chown=node:node --from=builder /build $APP_HOME
USER node
EXPOSE $APP_CONTAINER_PORT
ENTRYPOINT ["dumb-init"]
CMD ["npm", "start"]