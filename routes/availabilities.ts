// Node.js built-in modules

// Third-party libraries
import Router from 'express'
import passport from 'passport'

// Own modules
import {
    sanitizeInput
} from '../middleware/sanitizer.js'

// Controller functions
import {
    newOrUpdateAvailability
} from '../controllers/availabilityController.js'

// Destructuring and global variables
const router = Router()

/**
 * @route PUT api/v1/users/availabilities/:date
 * @desc Create a new availability or update existing if the date is the same.
 * @access AUTHENTICATED
*/
router.put('/:date',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    newOrUpdateAvailability
)

export default router
