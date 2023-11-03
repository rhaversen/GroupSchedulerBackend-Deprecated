// Node.js built-in modules

// Third-party libraries
import mongoose, { type Mongoose } from 'mongoose'

// Own modules
import logger from '../utils/logger.js'
import {
    getMongooseOptions,
    getMaxRetryAttempts,
    getRetryInterval
} from '../utils/setupConfig.js'

// Config
let mongooseConnection: Mongoose

const connectToDatabase = async (): Promise<void> => {
    const mongooseOpts = getMongooseOptions()
    const maxRetryAttempts = getMaxRetryAttempts()
    let currentRetryAttempt = 0

    while (currentRetryAttempt < maxRetryAttempts) {
        logger.info('Attempting connection to MongoDB')

        try {
            const mongoUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`
            // Use Mongoose to connect for production database
            mongooseConnection = await mongoose.connect(mongoUri, mongooseOpts)

            logger.info('Connected to MongoDB')
            return
        } catch (error: any) {
            logger.error(`Error connecting to MongoDB: ${error.message || error}`)
        }
        currentRetryAttempt++
        const retryInterval = getRetryInterval()
        await new Promise((resolve) => setTimeout(resolve, retryInterval))
    }
    logger.error(`Failed to connect to MongoDB after ${maxRetryAttempts} attempts. Shutting down.`)
    process.exit(1)
}

const disconnectFromDatabase = async (): Promise<void> => {
    try {
        // Disconnect Mongoose for both test and production
        if (mongooseConnection) {
            await mongooseConnection.disconnect()
            logger.info('Disconnected Mongoose connection')
        } else {
            logger.info('Attempted to disconnect Mongoose connection, but no connection was found')
        }
    } catch (error: any) {
        logger.error(`Error disconnecting from MongoDB: ${error.message || error}`)
    }
}

export { connectToDatabase, disconnectFromDatabase, mongoose }
