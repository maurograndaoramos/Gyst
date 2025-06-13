FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# No build step in Dockerfile - we'll run dev in the container

EXPOSE 3000

# The CMD will be overridden by docker-compose.yml
CMD ["npm", "run", "dev"]
