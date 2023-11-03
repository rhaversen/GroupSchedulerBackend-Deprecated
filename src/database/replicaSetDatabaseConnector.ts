// Node.js built-in modules

// Third-party libraries
import mongoose, { type Mongoose } from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

// Own modules
import logger from '../utils/logger.js'
import {
    getMongooseOptions
} from '../utils/setupConfig.js'

// Config
let mongooseConnection: Mongoose
let replSet: MongoMemoryReplSet | undefined

const connectToDatabase = async (): Promise<void> => {
    const mongooseOpts = getMongooseOptions()

    logger.info('Attempting connection to in-memory MongoDB')

    try {
        replSet = new MongoMemoryReplSet({
            replSet: { storageEngine: 'wiredTiger' }
        })

        await replSet.start()
        await replSet.waitUntilRunning()
        const mongoUri = replSet.getUri()
        mongooseConnection = await mongoose.connect(mongoUri, mongooseOpts)
        logger.info('Connected to in-memory MongoDB')
    } catch (error: any) {
        logger.error(`Error connecting to in-memory MongoDB: ${error.message || error}`)
    }
}

const disconnectFromDatabase = async (): Promise<void> => {
    try {
        // If using an in-memory database for development or tests
        if (replSet) {
            await replSet.stop()
            logger.info('In-memory MongoDB replica set stopped')
        }

        // Check if there's an active Mongoose connection in any environment
        if (mongooseConnection) {
            await mongooseConnection.disconnect()
            logger.info('Disconnected Mongoose connection')
        } else {
            logger.info('No Mongoose connection was found to disconnect')
        }
    } catch (error: any) {
        logger.error(`Error disconnecting from MongoDB: ${error.message || error}`)
    }
}

export { connectToDatabase, disconnectFromDatabase, mongoose }
