FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/observability/package.json packages/observability/package.json
RUN npm ci

FROM deps AS build
COPY tsconfig.json tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/contracts packages/contracts
COPY packages/events packages/events
COPY packages/observability packages/observability
RUN npm run build --workspace @swimpay/web

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/packages/events/dist ./packages/events/dist
COPY --from=build /app/packages/observability/dist ./packages/observability/dist
COPY docs/SDK_DEVELOPER_INTEGRATION_GUIDE.pdf ./docs/SDK_DEVELOPER_INTEGRATION_GUIDE.pdf
COPY apps/android-receiver/android/app/src/main/res/drawable-nodpi ./apps/android-receiver/android/app/src/main/res/drawable-nodpi
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/observability/package.json packages/observability/package.json
CMD ["npm", "run", "start", "--workspace", "@swimpay/web"]
