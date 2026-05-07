FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/bank-templates/package.json packages/bank-templates/package.json
COPY packages/security/package.json packages/security/package.json
COPY packages/observability/package.json packages/observability/package.json
RUN npm ci

FROM deps AS build
COPY tsconfig.json tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/events packages/events
COPY packages/contracts packages/contracts
COPY packages/bank-templates packages/bank-templates
COPY packages/security packages/security
COPY packages/observability packages/observability
RUN npm run build --workspace @swimpay/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/events/dist ./packages/events/dist
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/packages/bank-templates/dist ./packages/bank-templates/dist
COPY --from=build /app/packages/security/dist ./packages/security/dist
COPY --from=build /app/packages/observability/dist ./packages/observability/dist
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/bank-templates/package.json packages/bank-templates/package.json
COPY packages/security/package.json packages/security/package.json
COPY packages/observability/package.json packages/observability/package.json
CMD ["npm", "run", "start", "--workspace", "@swimpay/api"]
