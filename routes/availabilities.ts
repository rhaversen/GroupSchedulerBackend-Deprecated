// Node.js built-in modules

// Third-party libraries
import Router from 'express'
import { body, param, validationResult } from 'express-validator'
import passport from 'passport'

// Own modules
import {
    sanitizeInput
} from '../middleware/sanitizer.js'

// Controller functions
import {
    newOrUpdateAvailability,
    getAvailabilities
} from '../controllers/availabilityController.js'

// Destructuring and global variables
const router = Router()

/**
 * @route PUT api/v1/users/availabilities
 * @desc Create a new availability or update existing if the date is the same.
 * @access AUTHENTICATED
*/
router.put('/',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    newOrUpdateAvailability
)

/**
 * @route GET api/v1/users/availabilities
 * @desc Get all the users availabilities
 * @access AUTHENTICATED
*/
router.get('/',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    getAvailabilities
)

export default router
