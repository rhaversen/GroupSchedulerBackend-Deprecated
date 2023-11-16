// Load vault into env file
logger.silly('importing vault handling file')
import { connectToVault, loadSecrets } from './utils/vault.js'
logger.silly('calling connectToVault')
await connectToVault()
logger.silly('calling loadSecrets')
await loadSecrets()
logger.silly('done loading secrets from vault')

// Node.js built-in modules
import http from 'http'

// Third-party libraries
import express from 'express'
import mongoSanitize from 'express-mongo-sanitize'
import RateLimit from 'express-rate-limit'
import passport from 'passport'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import MongoStore from 'connect-mongo'

// Own modules
import logger from './utils/logger.js'
import globalErrorHandler from './middleware/globalErrorHandler.js'
import configurePassport from './utils/passportConfig.js'
import { initializeDatabaseConnection, closeDatabaseConnection, mongoose } from './database/databaseHandler.js'
// import csrfProtection from './utils/csrfProtection.js';
import {
    getHelmetCSP,
    getHelmetHSTS,
    getCorsOptions,
    getRelaxedApiLimiterConfig,
    getSensitiveApiLimiterConfig,
    getTestApiLimiterConfig,
    getExpressPort
} from './utils/setupConfig.js'

// Import routes
import userRoutes from './routes/users.js'
import eventRoutes from './routes/events.js'
import availabilityRoutes from './routes/availabilities.js'

// Global variables and setup
const app = express()
const index = http.createServer(app)

// Configs
const helmetCSP = getHelmetCSP()
const helmetHSTS = getHelmetHSTS()
const confCorsOptions = getCorsOptions()
const confRelaxedApiLimiter = getRelaxedApiLimiterConfig()
const confSensitiveApiLimiter = getSensitiveApiLimiterConfig()
const confTestApiLimiter = getTestApiLimiterConfig()
const expressPort = getExpressPort()

// Function invocations
configurePassport(passport)

// Helmet security
/* if (typeof helmetCSP === 'object' && helmetCSP !== null) {
    app.use(helmet.contentSecurityPolicy(helmetCSP))
} else {
    logger.warn('Helmet ContentSecurityPolicyOptions is not set! App not using CSP!')
}
// Only use HTTPS
if (typeof helmetHSTS === 'object' && helmetHSTS !== null) {
    app.use(helmet.strictTransportSecurity(helmetHSTS))
} else {
    logger.warn('Helmet StrictTransportSecurityOptions is not set! App not using HSTS!')
} */

// Connect to MongoDB (Automatically connect to in-memory replica set if not production environment)
await initializeDatabaseConnection()

// Configuration for session
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET ?? 'default_secret_key', // Ideally from an environment variable
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    },
    store: MongoStore.create({ client: mongoose.connection.getClient() })

})

// Global middleware
app.use(helmet())
app.use(express.json()) // for parsing application/json
app.use(cookieParser()) // For parsing cookies
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(mongoSanitize())
app.use(sessionMiddleware)
app.use(passport.initialize())
app.use(passport.session())
app.use(cors({
    ...confCorsOptions,
    credentials: true
}))
// app.use(csrfProtection);

// Create rate limiters
let relaxedApiLimiter
let sensitiveApiLimiter
if (process.env.NODE_ENV !== 'production') {
    relaxedApiLimiter = RateLimit(confTestApiLimiter)
    sensitiveApiLimiter = RateLimit(confTestApiLimiter)
} else {
    relaxedApiLimiter = RateLimit(confRelaxedApiLimiter)
    sensitiveApiLimiter = RateLimit(confSensitiveApiLimiter)
}

// Endpoint to fetch the csrf token
/* app.get('/api/csrf-token', sensitiveApiLimiter, (req, res) => {
    res.json({ csrfToken: req.session.csrfToken });
}); */

// App will be behind reverse proxy forwarding calls to domain.com/api/ to backend

// Use all routes and with relaxed limiter
app.use('/v1/users', relaxedApiLimiter, userRoutes)
app.use('/v1/users/availabilities', relaxedApiLimiter, availabilityRoutes)
app.use('/v1/events', relaxedApiLimiter, eventRoutes)

// Apply stricter rate limiters to routes
app.use('/v1/users/update-password', sensitiveApiLimiter)
app.use('/v1/users/login', sensitiveApiLimiter)
app.use('/v1/users/signup', sensitiveApiLimiter)

app.get('/', (req, res) => {
    res.send('pong')
})

// Global error handler middleware
app.use(globalErrorHandler)

// Start index
index.listen(expressPort, () => {
    logger.info(`App listening at http://localhost:${expressPort}`)
})

process.on('unhandledRejection', (reason, promise) => {
    // Attempt to get a string representation of the promise
    const promiseString = JSON.stringify(promise) || 'a promise'

    // Get a detailed string representation of the reason
    const reasonDetail = reason instanceof Error ? reason.stack || reason.message : JSON.stringify(reason)

    // Log the detailed error message
    logger.error(`Unhandled Rejection at: ${promiseString}, reason: ${reasonDetail}`)

    shutDown().catch(error => {
        // If 'error' is an Error object, log its stack trace; otherwise, convert to string
        const errorDetail = error instanceof Error ? error.stack || error.message : String(error)
        logger.error(`An error occurred during shutdown: ${errorDetail}`)
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
        await closeDatabaseConnection()
        logger.info('Shutdown completed')
        process.exit(0) // Exit with code 0 indicating successful termination
    } catch (error) {
        logger.error('An error occurred during shutdown:', error)
        process.exit(1) // Exit with code 1 indicating termination with error
    }
}

export type AppType = typeof app
export type ShutDownType = typeof shutDown
export { app, shutDown }
