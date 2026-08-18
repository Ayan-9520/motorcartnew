# LOCAL-ONLY catalog master mock JSON API (fixtures — not a real vehicle provider)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3099
COPY server.js ./server.js
COPY fixtures ./fixtures
EXPOSE 3099
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3099/health || exit 1
CMD ["node", "server.js"]
