import errors from '../utils/errors.mjs';
const {
    ValidationError, DatabaseError, ServerError
} = errors;

import { warn, error as _error } from '../utils/logger.js';

export default (function(err, req, res, next) {
    if (err instanceof ValidationError) {
        // These are client-safe errors that can be directly sent to the client.
        res.status(400).json({ error: err.message });
        warn(err.message)
    } else if (err instanceof EventError) {
        res.status(400).json({ error: err.message });
        _error(err.message);
    } else if (err instanceof DatabaseError || err instanceof ServerError) {
        // For server-side errors, send a generic error message
        res.status(500).json({ error: 'An error occurred, please try again later' });
        _error(err.message);
    } else {
        // If it's not one of the known errors, it could be anything - consider it a 500 error
        res.status(500).json({ error: 'An error occurred, please try again later' });
        _error(err.message);
    }
});