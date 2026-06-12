FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm install --legacy-peer-deps
COPY . .
WORKDIR /app/apps/backend

RUN printf 'DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy\nREDIS_URL=redis://localhost:6379\nJWT_SECRET=buildsecret\nCOOKIE_SECRET=buildsecret\nSTORE_CORS=http://localhost\nADMIN_CORS=http://localhost\nAUTH_CORS=http://localhost\nMEDUSA_BACKEND_URL=https://api.luxus-collection.com\n' > .env

RUN npm run build

# Patch Medusa admin currency formatters to divide cents by 100.
# The built-in admin SPA passes raw cent values to Intl.NumberFormat without
# dividing, so $5.35 displays as $535. These patterns are stable across minor
# builds; if a future Medusa upgrade changes them, the sed commands silently
# no-op and prices will display 100x again — re-investigate at that point.
RUN ASSETS=.medusa/server/public/admin/assets && \
    find "$ASSETS" -name "*.js" | xargs sed -i \
      -e 's|currencyDisplay:"narrowSymbol",currency:t}).format(e)|currencyDisplay:"narrowSymbol",currency:t}).format((e??0)/100)|g' \
      -e 's|i=e\.toLocaleString(void 0,{minimumFractionDigits:n,maximumFractionDigits:n})|i=((e??0)/100).toLocaleString(void 0,{minimumFractionDigits:n,maximumFractionDigits:n})|g' \
      -e 's|currency:t,signDisplay:"auto"}).format(r)|currency:t,signDisplay:"auto"}).format((r??0)/100)|g' \
      -e 's|currencyDisplay:"narrowSymbol",currency:t}).format(r)|currencyDisplay:"narrowSymbol",currency:t}).format((r??0)/100)|g' \
      -e 's|n=r\.toLocaleString(void 0,{minimumFractionDigits:a,maximumFractionDigits:a|n=((r??0)/100).toLocaleString(void 0,{minimumFractionDigits:a,maximumFractionDigits:a|g'

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
