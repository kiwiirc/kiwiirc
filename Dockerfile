FROM node:current-alpine as builder

WORKDIR /work
COPY . .

RUN yarn install && yarn run build

FROM nginx:mainline-alpine
COPY --from=builder /work/dist /usr/share/nginx/html
