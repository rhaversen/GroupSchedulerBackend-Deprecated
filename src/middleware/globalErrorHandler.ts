// Third-party libraries
import { type NextFunction, type Request, type Response } from 'express'

// Own modules
import { EventError, ServerError, ValidationError } from '../utils/errors.js'
import logger from '../utils/logger.js'

export default (function (err: Error, req: Request, res: Response, next: NextFunction): void {
    if (err instanceof ValidationError || err instanceof EventError) {
        // These are client-safe errors that can be directly sent to the client.
        logger.silly(err.message)
        res.status(400).json({ error: err.message })
    } else if (err instanceof ServerError) {
        // For server-side errors, send a generic error message
        logger.error(err.message)
        res.status(500).json({ error: 'A server- or database-error occurred, please try again later' })
    } else {
        // If it's not one of the known errors, it could be anything - consider it a 500 error
        logger.error(err.toString())

        if (err.stack) {
            logger.error('Error stack:', err.stack)
        }

        res.status(500).json({ error: 'An error occurred, please try again later' })
    }
})
