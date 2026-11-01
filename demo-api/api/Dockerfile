# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:26.13-alpine3.23

# Étape 1 : Installation des dépendances (deps)
FROM ${NODE_IMAGE} AS deps
WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci --omit=dev && npm cache clean --force

# Étape 2 : Image durcie et plus légère
FROM ${NODE_IMAGE}

RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

WORKDIR /app

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node server.js db.js package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

USER node

CMD ["node", "server.js"]