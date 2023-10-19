# This dockerfile specifies the environment the production
# code will be run in, along with what files are needed
# for production

# Use an official Node.js runtime as the base image
FROM --platform=linux/arm64 node:20.8.1-bookworm-slim

# Set working directory
WORKDIR /app

# Copy the `dist` directory, package.json and Config
COPY dist/ ./dist/
COPY package*.json ./
COPY config/ ./config/

# Install production dependencies
RUN npm install --omit=dev

# Expose the port Express.js runs on
EXPOSE 5000

# Command to run the application
CMD ["npm", "start"]
