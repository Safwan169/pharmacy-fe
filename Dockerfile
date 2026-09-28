# Build once with the full toolchain, then ship only what running needs.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# `next start` reads next.config.ts, and reading a TypeScript config needs the
# compiler, so typescript is kept even though nothing is compiled here.
RUN npm ci --omit=dev && npm install --no-save typescript && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY next.config.ts tsconfig.json next-env.d.ts ./
EXPOSE 5001
# Bound to every interface: inside a container, localhost is unreachable from
# the host and from the other services.
CMD ["npx", "next", "start", "--port", "5001", "--hostname", "0.0.0.0"]
