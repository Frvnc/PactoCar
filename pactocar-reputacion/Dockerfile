FROM node:20.11.1-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY . .

EXPOSE 3007

USER node

CMD ["node", "index.js"]
