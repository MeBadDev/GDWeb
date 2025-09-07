FROM node:20-slim AS base
WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm","start"]
