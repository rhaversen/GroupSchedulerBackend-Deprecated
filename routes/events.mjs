// Node.js built-in modules

// Third-party libraries
import Router from 'express';
import passport from 'passport';

// Own modules
import {
    checkUserInEvent,
    checkUserIsAdmin
} from '../middleware/eventUserChecks.mjs';
import {
    sanitizeInput,
} from '../middleware/sanitizer.mjs';

// Controller functions
import {
    newCode,
    getEvent,
    createEvent,
    updateEvent,
    joinEvent,
    leaveEvent,
    deleteEvent
} from '../controllers/eventController.mjs';

// Destructuring and global variables
const router = Router();

/**
 * @route POST api/v1/events/:eventIdOrCode/new-code
 * @desc Update event with a random event code
 * @access AUTHENTICATED
*/
router.post('/:eventIdOrCode/new-code',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    checkUserInEvent,
    checkUserIsAdmin,
    newCode
);

/**
 * @route GET api/v1/events/:eventId
 * @desc Get event from eventId
 * @access AUTHENTICATED
 */
router.get('/:eventIdOrCode',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    checkUserInEvent,
    getEvent
);

/**
 * @route POST api/v1/events
 * @desc Create a new event, add user to event, add event to user, add user to admins if only owner can edit event
 * @access AUTHENTICATED
 */
router.post('/',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    createEvent
);

/**
 * @route PATCH api/v1/events/:eventIdOrCode
 * @desc Update event with provided info
 * @access AUTHENTICATED
 */
router.patch('/:eventIdOrCode',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    checkUserInEvent,
    checkUserIsAdmin,
    updateEvent
);

/**
 * @route PUT /api/v1/events/:eventIdOrCode/users
 * @desc Join event. Add userId to event, add eventId to user
 * @access AUTHENTICATED
 */
router.put('/:eventIdOrCode/users',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    joinEvent
);

/**
 * @route DELETE api/v1/events/:eventIdOrCode/users
 * @desc Leave event. Remove user from event, remove event from user. Empty events are deleted automatically in Event.js
 * @access AUTHENTICATED
 */
router.delete('/:eventIdOrCode/users',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    checkUserInEvent,
    leaveEvent,
);

/**
 * @route DELETE api/v1/events/:eventIdOrCode
 * @desc Remove event for all users
 * @access AUTHENTICATED
 */
router.delete('/:eventIdOrCode',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    checkUserInEvent,
    checkUserIsAdmin,
    deleteEvent
);

export default router;