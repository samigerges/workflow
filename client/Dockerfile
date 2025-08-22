# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Argument for API base URL
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY client ./client
COPY shared ./shared
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js components.json ./
COPY attached_assets ./attached_assets

# Build shared package
RUN npm --prefix shared run build

# Build the frontend
RUN npx vite build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist/public /usr/share/nginx/html
EXPOSE 80
