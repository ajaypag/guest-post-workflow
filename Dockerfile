# Test Dockerfile - simplified version
FROM node:20-slim

# Cache busting argument
ARG CACHEBUST=1

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Echo cache bust to force rebuild from here
RUN echo "Cache bust: $CACHEBUST"

# Copy application files
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]