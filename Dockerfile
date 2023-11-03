# This dockerfile specifies the environment the production
# code will be run in, along with what files are needed
# for production

# Use an official Node.js runtime as the base image
FROM --platform=linux/arm64 node:20.8.1-bookworm-slim

# Set working directory
WORKDIR /app

# Create a user within the container
RUN useradd -m backend_user

# Copy the `dist` directory, package.json and Config
COPY dist/ ./dist/
COPY package*.json ./
COPY config/ ./config/

# Change the ownership of the copied files to backend_user
RUN chown -R backend_user:backend_user /app

# Switch to user for subsequent commands
USER backend_user

# Install production dependencies
RUN npm install --omit=dev

# Expose the port Express.js runs on
EXPOSE 5000

# Command to run the application
CMD ["npm", "start"]