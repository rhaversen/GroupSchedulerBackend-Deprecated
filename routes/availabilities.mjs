// Node.js built-in modules

// Third-party libraries
import { Router } from 'express';
import passport from 'passport';

// Own modules
import errors from '../utils/errors.mjs';
import logger from '../utils/logger.mjs';
import Availability from '../models/Availability.mjs';
import User from '../models/User.mjs';
import {
    getEvent,
    checkUserInEvent,
    checkUserIsAdmin
} from '../middleware/availabilityFunctions.mjs';
import {
    sanitizeInput,
  } from '../middleware/sanitizer.mjs';

// Destructuring and global variables
const {
    MissingFieldsError,
} = errors;
const router = Router();

/**
 * @route PUT api/v1/users/availabilities
 * @desc Update event with a random event code
 * @access AUTHENTICATED
*/
router.put('/',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    
);

export default router;