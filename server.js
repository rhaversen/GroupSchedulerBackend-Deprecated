require('dotenv').config();
const port = process.env.SERVER_PORT;

const mongoose = require('mongoose');

const path = require('path');
const logger = require('./utils/logger.js');

const express = require('express');
const app = express();

const mongoSanitize = require('express-mongo-sanitize');
const globalErrorHandler = require('./middleware/globalErrorHandler');
const passport = require('passport');

// Passport-JWT Strategy setup
require('./middleware/passportJwt')(passport); // pass passport for configuration

// Connect to MongoDB
mongoose
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
const userRoutes = require('./routes/users');
app.use('/api/v1/users', userRoutes);
const eventRoutes = require('./routes/events');
app.use('/api/v1/events', eventRoutes);

//Test index page
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

//Start server
app.listen(port, () => {
    logger.info(`App listening at http://localhost:${port}`);
});

module.exports = app;