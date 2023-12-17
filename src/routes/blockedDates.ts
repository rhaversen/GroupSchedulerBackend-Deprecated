// Node.js built-in modules

// Third-party libraries
import Router from 'express'

// Own modules
import { sanitizeInput } from '../middleware/sanitizer.js'
import { ensureAuthenticated } from '../utils/passportConfig.js'

// Controller functions
import {
    newBlockedDate,
    deleteBlockedDate
} from '../controllers/blockedDatesController.js'

// Destructuring and global variables
const router = Router()

/**
 * @route PUT api/v1/users/blockedDates/:date
 * @desc Create a new blocked date at the specified date
 * @access Authenticated
 */
router.put('/:fromDate/:toDate',
    sanitizeInput,
    ensureAuthenticated,
    newBlockedDate
)

/**
 * @route DELETE api/v1/users/blockedDates/:date
 * @desc Delete blocked date at the specified date
 * @access Authenticated
 */
router.delete('/:date',
    sanitizeInput,
    ensureAuthenticated,
    deleteBlockedDate
)

export default router
