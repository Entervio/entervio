FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# DEBUG: Show what was actually built
RUN echo "=== Contents of /app ===" && ls -la /app
RUN echo "=== Contents of /app/build ===" && ls -la /app/build || echo "No build directory!"
RUN echo "=== Contents of /app/build/server ===" && ls -la /app/build/server || echo "No build/server directory!"
RUN echo "=== Contents of /app/build/client ===" && ls -la /app/build/client || echo "No build/client directory!"

# Remove dev dependencies
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start"]