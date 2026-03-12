# Build stage
FROM node:20-alpine as build
WORKDIR /app
# Copy the frontend folder into the build context
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage
FROM nginx:stable-alpine
# Copy the custom Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
# Copy the build artifacts from the build stage
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
