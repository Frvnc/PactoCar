FROM node:20.11.1-alpine

WORKDIR /app

# Copiar dependencias e instalarlas
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de Express
EXPOSE 3000

# Comando para levantar el servidor en modo desarrollo
CMD ["npm", "run", "dev"]