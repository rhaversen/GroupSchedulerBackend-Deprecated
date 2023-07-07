import 'dotenv/config';
const port = process.env.SERVER_PORT;

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import logger from './utils/logger.mjs';
import globalErrorHandler from './middleware/globalErrorHandler.mjs';

import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';

import RateLimit from 'express-rate-limit';
import express from 'express';
const app = express();

import passport from 'passport';
import configurePassport from './utils/passportJwt.mjs';
configurePassport(passport);

// Connect to MongoDB
await mongoose
    .connect(
        `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}`, {
            useNewUrlParser: true, 
            useUnifiedTopology: true
        })
    .then(() => logger.info('MongoDB Connected...'))
    .catch((err) => logger.error(err));

// Middleware
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(mongoSanitize());
app.use(passport.initialize());
app.use(globalErrorHandler);

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

// Create stricter rate limiters for routes
const sensitiveApiLimiter = RateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 2
  });

// Apply the stricter rate limiters to the routes
app.use('/api/v1/users/update-password', sensitiveApiLimiter); // This route has a stricter limit

//Test index page
app.get('/', function(req, res) {
    res.sendFile(join(__dirname, '/public/index.html'));
});

//Start server
app.listen(port, () => {
    logger.info(`App listening at http://localhost:${port}`);
});

export default app;