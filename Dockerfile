FROM node:18-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack yarn install --frozen-lockfile --non-interactive --prefer-offline

COPY . .

RUN corepack yarn build

FROM nginx:alpine

COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 80
