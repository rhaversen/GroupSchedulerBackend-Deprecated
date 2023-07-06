import 'dotenv/config';
const port = process.env.SERVER_PORT;

import path from 'path';
import logger from './utils/logger.mjs';
import globalErrorHandler from './middleware/globalErrorHandler.mjs';

import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';

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

// Import and use routes
import userRoutes from './routes/users.mjs';
app.use('/api/v1/users', userRoutes);
import eventRoutes from './routes/events.mjs';
app.use('/api/v1/events', eventRoutes);

//Test index page
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

//Start server
app.listen(port, () => {
    logger.info(`App listening at http://localhost:${port}`);
});

export default app;