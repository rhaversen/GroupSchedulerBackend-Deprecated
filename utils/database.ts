// Node.js built-in modules

// Third-party libraries
import mongoose, { type Mongoose } from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

// Own modules
import logger from './logger.js'
import {
    getMongooseOptions,
    getMaxRetryAttempts,
    getRetryInterval
} from '../utils/setupConfig.js'

// Config
let mongooseConnection: Mongoose
let replSet: MongoMemoryReplSet | undefined

const connectToDatabase = async (): Promise<void> => {
    const mongooseOpts = getMongooseOptions();
    const maxRetryAttempts = getMaxRetryAttempts();
    let currentRetryAttempt = 0;

    while (currentRetryAttempt < maxRetryAttempts) {
        if (process.env.NODE_ENV === 'test') {
            logger.info('Attempting connection to in-memory MongoDB');

            try {
                replSet = new MongoMemoryReplSet({
                    replSet: { storageEngine: 'wiredTiger' },
                });

                await replSet.start();
                await replSet.waitUntilRunning();
                const mongoUri = replSet.getUri();
                mongooseConnection = await mongoose.connect(mongoUri, mongooseOpts);
                logger.info('Connected to in-memory MongoDB');
                return;
            } catch (error: any) {
                logger.error(`Error connecting to in-memory MongoDB: ${error.message || error}`);
            }
        } else {
            logger.info('Attempting connection to MongoDB');

            try {
                const mongoUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`;
                // Use Mongoose to connect for production database
                mongooseConnection = await mongoose.connect(mongoUri, mongooseOpts);

                logger.info('Connected to MongoDB');
                return;
            } catch (error: any) {
                logger.error(`Error connecting to MongoDB: ${error.message || error}`);
            }
        }
        currentRetryAttempt++;
        const retryInterval = getRetryInterval();
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
    logger.error(`Failed to connect to MongoDB after ${maxRetryAttempts} attempts.`);
}

const disconnectFromDatabase = async (): Promise<void> => {
    try {
        if (process.env.NODE_ENV === 'test' && replSet) {
            await replSet.stop();
            logger.info('In-memory MongoDB replica set stopped');
        }
        
        // Disconnect Mongoose for both test and production
        if (mongooseConnection) {
            await mongooseConnection.disconnect();
            logger.info('Disconnected specific Mongoose connection');
        }

        if (mongoose.connection.readyState !== 0) { // 0: disconnected
            await mongoose.disconnect();
            logger.info('Disconnected default Mongoose connection');
        }
    } catch (error: any) {
        logger.error(`Error disconnecting from MongoDB: ${error.message || error}`);
    }
}

const deleteAllDocumentsFromAllCollections = async () => {
    try {
        const collections = Object.keys(mongoose.connection.collections)
        for (const collectionName of collections) {
            const collection = mongoose.connection.collections[collectionName]
            await collection.deleteMany({})
        }
        logger.info('All documents from all collections have been deleted')
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error deleting documents from MongoDB: ${error.message}`)
        } else {
            logger.error(`Error deleting documents from MongoDB: ${error}`)
        }
    }
}

export { connectToDatabase, disconnectFromDatabase, deleteAllDocumentsFromAllCollections, mongoose }
