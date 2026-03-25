FROM node:18-alpine

WORKDIR /app

# Adicionando dependências internas para git e fuso horizontais BRT
RUN apk add --no-cache tzdata git
ENV TZ=America/Sao_Paulo

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "start"]
