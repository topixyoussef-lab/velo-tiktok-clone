FROM node:20-slim

RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

ENV DATA_DIR=/data
ENV NODE_ENV=production

VOLUME ["/data"]

CMD ["node", "node_modules/.bin/next", "start"]
