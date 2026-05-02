FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/signal-worker/package.json apps/signal-worker/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/matching-core/package.json packages/matching-core/package.json
COPY packages/bank-templates/package.json packages/bank-templates/package.json
COPY packages/observability/package.json packages/observability/package.json
RUN npm ci

FROM deps AS build
COPY tsconfig.json tsconfig.base.json ./
COPY apps/signal-worker apps/signal-worker
COPY packages/events packages/events
COPY packages/matching-core packages/matching-core
COPY packages/bank-templates packages/bank-templates
COPY packages/observability packages/observability
RUN npm run build --workspace @swimpay/signal-worker

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/signal-worker/dist ./apps/signal-worker/dist
COPY --from=build /app/packages/events/dist ./packages/events/dist
COPY --from=build /app/packages/matching-core/dist ./packages/matching-core/dist
COPY --from=build /app/packages/bank-templates/dist ./packages/bank-templates/dist
COPY --from=build /app/packages/observability/dist ./packages/observability/dist
COPY package.json package-lock.json ./
COPY apps/signal-worker/package.json apps/signal-worker/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/matching-core/package.json packages/matching-core/package.json
COPY packages/bank-templates/package.json packages/bank-templates/package.json
COPY packages/observability/package.json packages/observability/package.json
CMD ["npm", "run", "start", "--workspace", "@swimpay/signal-worker"]
