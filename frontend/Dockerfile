# Build stage
FROM node:20-alpine as build
WORKDIR /app
# Copy the frontend folder into the build context
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

# Production stage
FROM nginx:stable-alpine
# Nginx: SPA + reverse proxy (shared proxy headers included from proxy_rms.inc)
COPY nginx.proxy-headers.inc /etc/nginx/proxy_rms.inc
COPY nginx.conf /etc/nginx/templates/default.conf.template
# Copy the build artifacts from the build stage
COPY --from=build /app/dist /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]
