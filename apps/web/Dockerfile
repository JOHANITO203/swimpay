FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM deps AS build
COPY tsconfig.json tsconfig.base.json ./
COPY apps/web apps/web
RUN npm run build --workspace @swimpay/web

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
CMD ["npm", "run", "start", "--workspace", "@swimpay/web"]
