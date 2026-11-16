FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
ENV MONGOMS_DISABLE_POSTINSTALL=1
RUN npm ci
COPY client/ client/
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/client/dist ./client/dist
COPY package*.json ./
COPY server/ ./server/
COPY client/package.json ./client/package.json
USER node
EXPOSE 3000
CMD ["node", "server/src/index.js"]
