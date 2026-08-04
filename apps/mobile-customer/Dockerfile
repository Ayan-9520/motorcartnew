# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_API_URL=
ARG EXPO_PUBLIC_WEB_URL=http://localhost:3000
ARG EXPO_PUBLIC_SHOW_DEMO=1
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_WEB_URL=$EXPO_PUBLIC_WEB_URL
ENV EXPO_PUBLIC_SHOW_DEMO=$EXPO_PUBLIC_SHOW_DEMO

RUN npm run build:docker

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
