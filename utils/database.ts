// Node.js built-in modules
import config from 'config'

// Third-party libraries
import 'dotenv/config'
import mongoose, { type ConnectOptions } from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Own modules
import logger from './logger.js'

// Config
const mongooseOpts = config.get('mongoose.options') as ConnectOptions
const maxRetryAttempts = Number(config.get('mongoose.retrySettings.maxAttempts'))
const retryInterval = Number(config.get('mongoose.retrySettings.interval')) // ms

let memoryServer: MongoMemoryServer

const connectToDatabase = async () => {
    if (process.env.NODE_ENV === 'development') {
        memoryServer = await MongoMemoryServer.create()
        const mongoUri = memoryServer.getUri()
        await mongoose.connect(mongoUri, mongooseOpts)
        logger.info('Connected to in-memory MongoDB')
    } else {
        logger.info('Attempting to connect to to MongoDB')
        const mongoUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`

        let currentRetryAttempt = 0

        while (currentRetryAttempt < maxRetryAttempts) {
            try {
                await mongoose.connect(mongoUri, mongooseOpts)
                logger.info('MongoDB Connected...')
                return // Exit the function if the connection is successful
            } catch (error) {
                if (error instanceof Error) {
                    logger.error(`Error connecting to MongoDB: ${error.message}`)
                } else {
                    logger.error(`Error connecting to MongoDB: ${error}`)
                }
                currentRetryAttempt++
                await new Promise((resolve) => setTimeout(resolve, retryInterval))
            }
        }
        logger.error(`Failed to connect to MongoDB after ${maxRetryAttempts} attempts.`)
    }
}

const disconnectFromDatabase = async () => {
    if (process.env.NODE_ENV === 'development' && memoryServer) {
        try {
            await mongoose.disconnect()
            await memoryServer.stop()
            logger.info('Disconnected from in-memory MongoDB')
        } catch (error) {
            if (error instanceof Error) {
                logger.error(`Error connecting to MongoDB: ${error.message}`)
            } else {
                logger.error(`Error connecting to MongoDB: ${error}`)
            }
        }
    } else {
        try {
            await mongoose.disconnect()
            logger.info('Disconnected from MongoDB')
        } catch (error) {
            if (error instanceof Error) {
                logger.error(`Error disconnecting from MongoDB: ${error.message}`)
            } else {
                logger.error(`Error disconnecting from MongoDB: ${error}`)
            }
        }
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

export { connectToDatabase, disconnectFromDatabase, deleteAllDocumentsFromAllCollections }
