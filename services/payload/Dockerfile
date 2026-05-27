FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run generate:importmap
RUN rm -f .next/lock && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src
RUN mkdir -p /app/media
EXPOSE 3000
CMD ["sh", "-c", "npx payload migrate 2>/dev/null || true && npm run start"]
