# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY client ./client
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js components.json ./
COPY attached_assets ./attached_assets

# Build the frontend
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist/public /usr/share/nginx/html
EXPOSE 80
