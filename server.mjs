// Node.js built-in modules
import http from 'http';

// Third-party libraries
import 'dotenv/config';
import express from 'express';
import 'express-async-errors';
import mongoSanitize from 'express-mongo-sanitize';
import RateLimit from 'express-rate-limit';
import passport from 'passport';
import helmet from 'helmet';
import cors from 'cors';

// Own modules
import logger from './utils/logger.mjs';
import globalErrorHandler from './middleware/globalErrorHandler.mjs';
import configurePassport from './utils/passportJwt.mjs';
import { connectToDatabase, disconnectFromDatabase } from './database.mjs';

// Global variables and setup
const expressPort = process.env.EXPRESS_PORT;
const nextJsPort = process.env.NEXTJS_PORT;
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

// CORS setup
const corsOptions = {
    origin: 'http://localhost:' + nextJsPort, // Replace with your Next.js app's localhost domain and port
    //methods: 'GET,POST,PATCH,PUT,DELETE', // You can specify the methods you want to allow
  };


// Global middleware
app.use(helmet());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(mongoSanitize());
app.use(passport.initialize());
app.use(cors(corsOptions));

// Connect to MongoDB
await connectToDatabase();

// Create rate limiter for general routes
const apiLimiter = RateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 60
});

// Import and use routes, apply general rate limiter
import userRoutes from './routes/users.mjs';
app.use('/api/v1/users', apiLimiter, userRoutes);
import eventRoutes from './routes/events.mjs';
app.use('/api/v1/events', apiLimiter, eventRoutes);
import availabilityRoutes from './routes/availabilities.mjs';
app.use('/api/v1/users/availabilities', apiLimiter, availabilityRoutes);

// Create stricter rate limiters for routes
const sensitiveApiLimiter = RateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 2
});

// Apply the stricter rate limiters to the routes
app.use('/api/v1/users/update-password', sensitiveApiLimiter); // This route has a stricter limit

// Start server
server.listen(expressPort, () => {
    logger.info(`App listening at http://localhost:${expressPort}`);
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
async function shutDown() {
    try{
        logger.info('Starting database disconnection...');
        await disconnectFromDatabase();
        logger.info('Shutdown completed');
        process.exit(0) // Exit with code 0 indicating successful termination
    } catch(err){
        logger.error('An error occurred during shutdown:', err);
        process.exit(1); // Exit with code 1 indicating termination with error
    }
}

// Assigning handler to SIGINT signal
process.on('SIGINT', shutDown);

export { app, shutDown };