# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Приложение статическое, поэтому конфиг аналитики попадает в бандл на сборке,
# а не читается в рантайме. Без этих аргументов umami просто отключён.
ARG NUXT_UMAMI_HOST=""
ARG NUXT_UMAMI_ID=""
ENV NUXT_UMAMI_HOST=$NUXT_UMAMI_HOST \
    NUXT_UMAMI_ID=$NUXT_UMAMI_ID
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
