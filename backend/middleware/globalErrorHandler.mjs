// Own modules
import errors from '../utils/errors.mjs';
import logger from '../utils/logger.mjs';

// Destructuring and global variables
const {
    ValidationError,
    EventError,
    ServerError,
} = errors;

export default (function(err, req, res, next) {
    if (err instanceof ValidationError) {
        // These are client-safe errors that can be directly sent to the client.
        logger.warn(err.message)
        res.status(400).json({ error: err.message });
    } else if (err instanceof EventError) {
        logger.error(err.message);
        res.status(400).json({ error: err.message });
    } else if (err instanceof ServerError) {
        // For server-side errors, send a generic error message
        logger.error(err.message);
        res.status(500).json({ error: 'A server- or database-error occurred, please try again later' });
    } else {
        // If it's not one of the known errors, it could be anything - consider it a 500 error
        logger.error(err.message);
        res.status(500).json({ error: 'An error occurred, please try again later' });
    }
});