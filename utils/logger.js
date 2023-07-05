require('dotenv').config();

const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
    levels: {info: 0, warn: 1, error: 2},
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(), // Use JSON format for logs
        winston.format.printf((logObject) => {
            return `${logObject.timestamp} ${logObject.level}: ${logObject.message}`;
        }),
    ),
    defaultMeta: { service: 'group-scheduler' }, // Set a default metadata field
    transports: [
        new winston.transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 2 }),
        new winston.transports.File({ filename: path.join(__dirname, '../logs/combined.log') }),
    ],
});
  
// If you want to log to the console in addition to files during development, you can add the following code:
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );
}

 module.exports = logger;
