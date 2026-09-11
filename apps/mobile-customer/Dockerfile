# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Empty API URL = browser calls same-origin /api (nginx proxies → real backend)
ARG EXPO_PUBLIC_API_URL=
ARG EXPO_PUBLIC_WEB_URL=https://motorcart.in
ARG EXPO_PUBLIC_SHOW_DEMO=0
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_WEB_URL=$EXPO_PUBLIC_WEB_URL
ENV EXPO_PUBLIC_SHOW_DEMO=$EXPO_PUBLIC_SHOW_DEMO
ENV EXPO_PUBLIC_SHOW_DEMO_LOGINS=$EXPO_PUBLIC_SHOW_DEMO

RUN npm run build:docker

FROM nginx:1.27-alpine AS runner
# Local stack: backend container. Live data from PC: https://motorcart.in
ARG MOBILE_API_UPSTREAM=http://backend:3001
ARG MOBILE_API_HOST=backend
COPY nginx.conf /tmp/nginx.conf
RUN sed -e "s|__API_UPSTREAM__|${MOBILE_API_UPSTREAM}|g" \
        -e "s|__API_HOST__|${MOBILE_API_HOST}|g" \
        /tmp/nginx.conf > /etc/nginx/conf.d/default.conf \
 && rm /tmp/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
