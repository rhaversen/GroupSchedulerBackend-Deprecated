// Node.js built-in modules

// Third-party libraries
import Router from 'express'

// Own modules
import { sanitizeInput } from '../middleware/sanitizer.js'
import { ensureAuthenticated } from '../utils/passportConfig.js'

// Controller functions
import { getAvailabilities, newAvailability, updateAvailability, deleteAvailability } from '../controllers/availabilityController.js'

// Destructuring and global variables
const router = Router()

/**
 * @route PUT api/v1/users/availabilities/:date
 * @desc Create a new availability
 * @access Authenticated
 */
router.put('/:date',
    sanitizeInput,
    ensureAuthenticated,
    newAvailability
)

/**
 * @route PATCH api/v1/users/availabilities/:availabilityId
 * @desc Update existing availability availability
 * @access Authenticated
 */
router.patch('/:availabilityId',
    sanitizeInput,
    ensureAuthenticated,
    updateAvailability
)

/**
 * @route GET api/v1/users/availabilities/:fromDate/:toDate
 * @desc Get the user's availabilities between and including the specified dates
 * @access Authenticated
 */
router.get('/:fromDate/:toDate',
    sanitizeInput,
    ensureAuthenticated,
    getAvailabilities
)

/**
 * @route DELETE api/v1/users/availabilities/:availabilityId
 * @desc Delete availability with the specified availabilityId
 * @access Authenticated
 */
router.delete('/:availabilityId',
    sanitizeInput,
    ensureAuthenticated,
    deleteAvailability
)

export default router
