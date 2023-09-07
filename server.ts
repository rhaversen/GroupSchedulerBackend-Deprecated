// Node.js built-in modules
import http from 'http'
import config from 'config'

// Third-party libraries
import 'dotenv/config'
import express from 'express'
import 'express-async-errors'
import mongoSanitize from 'express-mongo-sanitize'
import RateLimit, { type Options as RateLimitOptions } from 'express-rate-limit'
import passport from 'passport'
import helmet, { type HelmetOptions } from 'helmet'
import cors, { type CorsOptions } from 'cors'
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';

// Own modules
import logger from './utils/logger.js'
import globalErrorHandler from './middleware/globalErrorHandler.js'
import configurePassport from './utils/passportConfig.js'
import { connectToDatabase, disconnectFromDatabase, mongoose } from './utils/database.js'

// Import routes
import userRoutes from './routes/users.js'
import eventRoutes from './routes/events.js'
import availabilityRoutes from './routes/availabilities.js'

// Global variables and setup
const app = express()
const server = http.createServer(app)

// Types
type ContentSecurityPolicyOptions = HelmetOptions['contentSecurityPolicy']
type HstsOptions = HelmetOptions['hsts']

// Configs
const helmetCSP = config.get('helmet.CSP') as ContentSecurityPolicyOptions
const helmetHSTS = config.get('helmet.HSTS') as HstsOptions
const confCorsOptions = config.get('corsOpts') as CorsOptions
const confRelaxedApiLimiter = config.get('apiLimiter.nonSensitive') as RateLimitOptions
const confSensitiveApiLimiter = config.get('apiLimiter.sensitive') as RateLimitOptions
const expressPort = config.get('ports.express')

// Config warns
helmetCSP ?? logger.warn('Config helmet.CSP missing')
helmetHSTS ?? logger.warn('Config helmet.HSTS missing')
confCorsOptions ?? logger.warn('Config corsOpts missing')
confRelaxedApiLimiter ?? logger.warn('Config apiLimiter.nonSensitive missing')
confSensitiveApiLimiter ?? logger.warn('Config apiLimiter.sensitive missing')
expressPort ?? logger.warn('Config ports.express missing')

// Function invocations
configurePassport(passport)

// Helmet security
if (typeof helmetCSP === 'object' && helmetCSP !== null) {
    app.use(helmet.contentSecurityPolicy(helmetCSP))
} else {
    logger.warn('Helmet ContentSecurityPolicyOptions is not set! App not using CSP!')
}
// Only use HTTPS
if (typeof helmetHSTS === 'object' && helmetHSTS !== null) {
    app.use(helmet.strictTransportSecurity(helmetHSTS))
} else {
    logger.warn('Helmet StrictTransportSecurityOptions is not set! App not using HSTS!')
}

// Connect to MongoDB
await connectToDatabase()

// Configuration for session
const sessionMiddleware  = session({
    secret: process.env.SESSION_SECRET || 'default_secret_key', // Ideally from an environment variable
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true
    },
    store: new MongoStore({
        client: mongoose.connection.getClient()
    })
});

// Global middleware
app.use(helmet())
app.use(express.json()) // for parsing application/json
app.use(cookieParser()) // For parsing cookies
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(mongoSanitize())
app.use(sessionMiddleware)
app.use(passport.initialize())
app.use(passport.session())
app.use(cors(confCorsOptions))

// Create rate limiters
const relaxedApiLimiter = RateLimit(confRelaxedApiLimiter)
const sensitiveApiLimiter = RateLimit(confSensitiveApiLimiter)

// Use all routes and with relaxed limiter
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
process.on('SIGINT', () => {
    logger.info('Received SIGINT')
    shutDown().catch(error => {
        logger.error('An error occurred during shutdown:', error)
        process.exit(1)
    })
})

// Shutdown function
async function shutDown () {
    try {
        logger.info('Starting database disconnection...')
        await disconnectFromDatabase()
        logger.info('Shutdown completed')
        process.exit(0) // Exit with code 0 indicating successful termination
    } catch (error) {
        logger.error('An error occurred during shutdown:', error)
        process.exit(1) // Exit with code 1 indicating termination with error
    }
}

export type AppType = typeof app;
export type ShutDownType = typeof shutDown;
export { app, shutDown }