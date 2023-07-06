import dotenv from 'dotenv';
dotenv.config();

import { createLogger, format as _format, transports as _transports } from 'winston';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const logger = createLogger({
    levels: {info: 0, warn: 1, error: 2},
    format: _format.combine(
        _format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        _format.json(), // Use JSON format for logs
        _format.printf((logObject) => {
            return `${logObject.timestamp} ${logObject.level}: ${logObject.message}`;
        }),
    ),
    defaultMeta: { service: 'group-scheduler' }, // Set a default metadata field
    transports: [
        new _transports.File({ filename: join(__dirname, '../logs/error.log'), level: 2 }),
        new _transports.File({ filename: join(__dirname, '../logs/combined.log') }),
    ],
});
  
// If you want to log to the console in addition to files during development, you can add the following code:
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new _transports.Console({
            format: _format.simple(),
        })
    );
}

 export default logger;
