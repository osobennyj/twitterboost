FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npx", "@grok/agent-sdk", "serve", "--dir", ".", "--host", "0.0.0.0", "--port", "3000"]
