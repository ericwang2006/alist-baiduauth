FROM node:20.9-slim

WORKDIR /app

COPY package.json ./

# 更新证书和安装 npm 依赖
RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates && npm install

COPY worker.js ./
COPY wrangler.toml ./

EXPOSE 8787

CMD ["npm", "run", "start"]
