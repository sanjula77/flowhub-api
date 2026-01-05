FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first (better Docker layer caching)
COPY package*.json ./

# Install dependencies
# Using npm ci for faster, reproducible builds
RUN npm ci --legacy-peer-deps --fetch-timeout=600000 || \
    (echo "npm ci failed, falling back to npm install..." && \
     npm install --legacy-peer-deps --fetch-timeout=600000)

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
