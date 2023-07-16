// Node.js built-in modules
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

// Third-party libraries
import 'dotenv/config';
import express from 'express';
import 'express-async-errors';
import mongoSanitize from 'express-mongo-sanitize';
import RateLimit from 'express-rate-limit';
import passport from 'passport';
import helmet from 'helmet';

//test

// Own modules
import logger from './utils/logger.mjs';
import globalErrorHandler from './middleware/globalErrorHandler.mjs';
import configurePassport from './utils/passportJwt.mjs';
import { connectToDatabase, disconnectFromDatabase } from './database.mjs';

// Global variables and setup
const port = process.env.SERVER_PORT;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const server = http.createServer(app);

// Function invocations
configurePassport(passport);

// Helmet security
// Prevent Cross-Site Scripting (XSS) attacks, which can often lead to CSRF attacks
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'"],
        },
    })
);
// Only use HTTPS
//app.use(helmet.hsts({
//    maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
//    includeSubDomains: true,
//    preload: true
//}));

// Global middleware
app.use(helmet());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(mongoSanitize());
app.use(passport.initialize());

// Connect to MongoDB
await connectToDatabase();

// Create rate limiter for general routes
const apiLimiter = RateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 5
});

// Import and use routes, apply general rate limiter
import userRoutes from './routes/users.mjs';
app.use('/api/v1/users', apiLimiter, userRoutes);
import eventRoutes from './routes/events.mjs';
app.use('/api/v1/events', apiLimiter, eventRoutes);
import availabilityRoutes from './routes/availabilities.mjs';
app.use('/api/v1/availabilities', apiLimiter, availabilityRoutes);

// Create stricter rate limiters for routes
const sensitiveApiLimiter = RateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 2
});

// Apply the stricter rate limiters to the routes
app.use('/api/v1/users/update-password', sensitiveApiLimiter); // This route has a stricter limit

// Start server
server.listen(port, () => {
    logger.info(`App listening at http://localhost:${port}`);
});

// Global error handler middleware
app.use(globalErrorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled promise rejection:', err);
    server.close(() => {
        process.exit(1);
    });
});

// Handler function to handle the Promise
function shutDown() {
    cleanUp()
    .then(() => logger.info('Shutdown completed'))
    .catch((err) => {
    logger.error('An error occurred during shutdown:', err);
    });
}

// Shutdown function
async function cleanUp() {
    logger.info('Starting disconnection...');
    try {
        await disconnectFromDatabase();
        server.close(() => {
            logger.info('Server closed');
            process.exit(0); // Exit with code 0 indicating successful termination
        });
    } catch (error) {
        logger.error('Error disconnecting from database:', error);
        server.close(() => {
            logger.info('Server closed with error');
            process.exit(1); // Exit with code 1 indicating termination with error
        });
    }
}

// Assigning handler to SIGINT signal
process.on('SIGINT', shutDown);

export { app, shutDown };