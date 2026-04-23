FROM node:21-bookworm-slim AS builder
RUN apt-get update && apt-get upgrade -y
WORKDIR /build

COPY service-a/package.json service-a/package-lock.json service-a/tsconfig.json ./
COPY service-a/src ./src

RUN npm ci
RUN npm run build

FROM node:21-bookworm-slim
RUN apt-get update && apt-get upgrade -y && apt-get install -y dumb-init

ENV HOME=/home/app
ENV APP_HOME=$HOME/node/
WORKDIR $APP_HOME

COPY --chown=node:node --from=builder /build $APP_HOME
COPY --chown=node:node service-a/package.json service-a/package-lock.json $APP_HOME

USER node
EXPOSE 3000 

ENTRYPOINT ["dumb-init"]
CMD ["npm", "start"]