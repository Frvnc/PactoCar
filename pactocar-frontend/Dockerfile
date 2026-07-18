# Stage 1 — Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .

ARG VITE_API_URL=http://localhost:3000
ARG VITE_PAGOS_URL=http://localhost:3005
ARG VITE_CONTRATOS_URL=http://localhost:3006
ARG VITE_REPUTACION_URL=http://localhost:3007
ARG VITE_CHAT_URL=http://localhost:3008
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PAGOS_URL=$VITE_PAGOS_URL
ENV VITE_CONTRATOS_URL=$VITE_CONTRATOS_URL
ENV VITE_REPUTACION_URL=$VITE_REPUTACION_URL
ENV VITE_CHAT_URL=$VITE_CHAT_URL

RUN npm run build

# Stage 2 — Serve
FROM nginx:1.27-alpine

RUN apk upgrade --no-cache

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
