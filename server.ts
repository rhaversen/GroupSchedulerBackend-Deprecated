// Node.js built-in modules
import http from 'http'
import config from 'config'

// Third-party libraries
import 'dotenv/config'
import express from 'express'
import 'express-async-errors'
import mongoSanitize from 'express-mongo-sanitize'
import RateLimit from 'express-rate-limit'
import passport from 'passport'
import helmet from 'helmet'
import cors from 'cors'

// Own modules
import logger from './utils/logger.js'
import globalErrorHandler from './middleware/globalErrorHandler.js'
import configurePassport from './utils/passportJwt.js'
import { connectToDatabase, disconnectFromDatabase } from './database.js'

// Import and use routes, apply general rate limiter
import userRoutes from './routes/users.js'
import eventRoutes from './routes/events.js'
import availabilityRoutes from './routes/availabilities.js'

// Global variables and setup
const app = express()
const server = http.createServer(app)

// Configs
const helmetCSP = config.get('helmet.CSP')
const corsOptions = config.get('corsOpts')
const confRelaxedApiLimiter = config.get('apiLimiter.nonSensitive')
const confSensitiveApiLimiter = config.get('apiLimiter.sensitive')
const expressPort = config.get('ports.express')
const helmetHSTS = config.get('helmet.HSTS')

// Function invocations
configurePassport(passport)

// Helmet security
app.use(helmet.contentSecurityPolicy(helmetCSP))
// Only use HTTPS
// app.use(helmet.hsts(helmetHSTS));

// Global middleware
app.use(helmet())
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(mongoSanitize())
app.use(passport.initialize())
app.use(cors(corsOptions))

// Connect to MongoDB
await connectToDatabase()

// Create rate limiters
const relaxedApiLimiter = RateLimit(confRelaxedApiLimiter)
const sensitiveApiLimiter = RateLimit(confSensitiveApiLimiter)

// Use all routes with relaxed limiter
app.use('/api/v1/users', relaxedApiLimiter, userRoutes)
app.use('/api/v1/users/availabilities', relaxedApiLimiter, availabilityRoutes)
app.use('/api/v1/events', relaxedApiLimiter, eventRoutes)

// Apply stricter rate limiters to routes
app.use('/api/v1/users/update-password', sensitiveApiLimiter)
app.use('/api/v1/users/login', sensitiveApiLimiter)
app.use('/api/v1/users/signup', sensitiveApiLimiter)

// Global error handler middleware
app.use(globalErrorHandler)

// Start server
server.listen(expressPort, () => {
    logger.info(`App listening at http://localhost:${expressPort}`)
})

// Handle unhandled promise rejections outside middleware
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
    shutDown().catch(error => {
        logger.error('An error occurred during shutdown:', error)
        process.exit(1)
    })
})

// Handle uncaught exceptions outside middleware
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err)
    shutDown().catch(error => {
        logger.error('An error occurred during shutdown:', error)
        process.exit(1)
    })
})

// Assigning shutdown function to SIGINT signal
process.on('SIGINT', shutDown)

// Shutdown function
async function shutDown () {
    try {
        logger.info('Starting database disconnection...')
        await disconnectFromDatabase()
        logger.info('Shutdown completed')
        process.exit(0) // Exit with code 0 indicating successful termination
    } catch (err) {
        logger.error('An error occurred during shutdown:', err)
        process.exit(1) // Exit with code 1 indicating termination with error
    }
}

export { app, shutDown }
