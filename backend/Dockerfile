# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,id=kms-backend-npm,target=/root/.npm,sharing=locked \
    npm ci --ignore-scripts --no-audit --no-fund --prefer-offline
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4005
COPY package*.json ./
RUN --mount=type=cache,id=kms-backend-npm,target=/root/.npm,sharing=locked \
    npm ci --omit=dev --ignore-scripts --no-audit --no-fund --prefer-offline
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 4005
CMD ["node", "dist/main.js"]
