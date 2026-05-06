FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/job-worker/package.json apps/job-worker/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY packages/security/package.json packages/security/package.json
RUN npm ci

FROM deps AS build
COPY tsconfig.json tsconfig.base.json ./
COPY apps/job-worker apps/job-worker
COPY packages/events packages/events
COPY packages/observability packages/observability
COPY packages/security packages/security
RUN npm run build --workspace @swimpay/job-worker

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/job-worker/dist ./apps/job-worker/dist
COPY --from=build /app/packages/events/dist ./packages/events/dist
COPY --from=build /app/packages/observability/dist ./packages/observability/dist
COPY --from=build /app/packages/security/dist ./packages/security/dist
COPY package.json package-lock.json ./
COPY apps/job-worker/package.json apps/job-worker/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY packages/security/package.json packages/security/package.json
CMD ["npm", "run", "start", "--workspace", "@swimpay/job-worker"]
