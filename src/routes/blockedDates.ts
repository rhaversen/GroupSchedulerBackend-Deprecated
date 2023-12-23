// Node.js built-in modules

// Third-party libraries
import Router from 'express'

// Own modules
import { sanitizeInput } from '../middleware/sanitizer.js'
import { ensureAuthenticated } from '../utils/passportConfig.js'

// Controller functions
import { deleteBlockedDate, newBlockedDate } from '../controllers/blockedDatesController.js'

// Destructuring and global variables
const router = Router()

/**
 * @route PUT api/v1/users/blockedDates/:fromDate/:toDate
 * @desc Put blocked dates between and including the specified dates
 * @access Authenticated
 */
router.put('/:fromDate/:toDate',
    sanitizeInput,
    ensureAuthenticated,
    newBlockedDate
)

/**
 * @route DELETE api/v1/users/blockedDates/:fromDate/:toDate
 * @desc Delete blocked dates between and including the specified dates
 * @access Authenticated
 */
router.delete('/:fromDate/:toDate',
    sanitizeInput,
    ensureAuthenticated,
    deleteBlockedDate
)

export default router
