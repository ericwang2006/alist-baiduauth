FROM node:20.9-slim

WORKDIR /app

COPY package.json ./

RUN npm install

COPY worker.js ./
COPY wrangler.toml ./

EXPOSE 8787

CMD ["npm", "run", "start"]
