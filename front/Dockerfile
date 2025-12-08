FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies with npm
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]