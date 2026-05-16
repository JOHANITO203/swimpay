FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/landing/package.json apps/landing/package.json
RUN npm ci

FROM deps AS build
COPY apps/landing apps/landing
RUN npm run build --workspace @swimpay/landing

FROM nginx:1.27-alpine AS runner
COPY --from=build /app/apps/landing/dist /usr/share/nginx/html
COPY apps/landing/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
