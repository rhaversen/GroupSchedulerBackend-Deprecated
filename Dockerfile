# Use an official Node.js runtime as the base image
FROM node:20.8

# Set working directory
WORKDIR /app

# Copy the `dist` directory and package.json
COPY dist/ ./dist/
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Expose the port Express.js runs on
EXPOSE 5000

# Command to run the application
CMD ["npm", "start"]
