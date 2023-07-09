// Node.js built-in modules

// Third-party libraries
import 'dotenv/config';
import mongoose from 'mongoose';

// Own modules
import logger from './utils/logger.mjs';

const connectToDatabase = async () => {
    logger.info(`Attempting to connect to to MongoDB`);
    const maxRetryAttempts = process.env.DB_CONNECTION_RETRY_MAX_ATTEMPTS || 5;
    const retryInterval = process.env.DB_CONNECTION_RETRY_INTERVAL || 1000;
  
    let currentRetryAttempt = 0;
  
    while (currentRetryAttempt < maxRetryAttempts) {
        try {
            await mongoose
            .connect(
                `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}`, {
                    useNewUrlParser: true, 
                    useUnifiedTopology: true
                }
            );
            logger.info('MongoDB Connected...');
            return; // Exit the function if the connection is successful
        } catch (error) {
            logger.error(`Error connecting to MongoDB: ${error.message}`);
            currentRetryAttempt++;
            await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
    }
    logger.error(`Failed to connect to MongoDB after ${maxRetryAttempts} attempts.`);
};

const disconnectFromDatabase = async () => {
    try {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    } catch (error) {
        logger.error(`Error disconnecting from MongoDB: ${error.message}`);
    }
};

export { connectToDatabase, disconnectFromDatabase };