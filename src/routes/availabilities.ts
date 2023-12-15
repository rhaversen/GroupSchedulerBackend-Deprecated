// Node.js built-in modules

// Third-party libraries
import Router from 'express'

// Own modules
import { sanitizeInput } from '../middleware/sanitizer.js'
import { ensureAuthenticated } from '../utils/passportConfig.js'

// Controller functions
import { getAvailabilities, newOrUpdateAvailability } from '../controllers/availabilityController.js'

// Destructuring and global variables
const router = Router()

/**
 * @route PUT api/v1/users/availabilities
 * @desc Create a new availability or update existing if the date is the same.
 * @access Authenticated
 */
router.put('/',
    sanitizeInput,
    ensureAuthenticated,
    newOrUpdateAvailability
)

/**
 * @route GET api/v1/users/availabilities
 * @desc Get all the users availabilities
 * @access Authenticated
 */
router.get('/',
    sanitizeInput,
    ensureAuthenticated,
    getAvailabilities
)

export default router
