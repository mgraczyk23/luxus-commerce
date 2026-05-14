FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm install --legacy-peer-deps
COPY . .
WORKDIR /app/apps/backend

RUN printf 'DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy\nREDIS_URL=redis://localhost:6379\nJWT_SECRET=buildsecret\nCOOKIE_SECRET=buildsecret\nSTORE_CORS=http://localhost\nADMIN_CORS=http://localhost\nAUTH_CORS=http://localhost\n' > .env

RUN npm run build

FROM node:20-alpine
WORKDIR /app/apps/backend

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/backend/.medusa ./.medusa
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/apps/backend/medusa-config.* ./
COPY --from=builder /app/apps/backend/tsconfig.json ./
COPY --from=builder /app/apps/backend/src ./src
RUN ln -s /app/node_modules ./node_modules
RUN mkdir -p /app/apps/backend/uploads

ENV PATH="/app/node_modules/.bin:$PATH"
EXPOSE 9000
CMD sh -c 'env > .env && cd .medusa/server && ln -sf /app/node_modules node_modules && ln -sf /app/apps/backend/.env .env && medusa db:migrate 2>&1 && medusa start'
