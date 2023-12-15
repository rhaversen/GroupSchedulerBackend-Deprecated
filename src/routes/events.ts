// Node.js built-in modules

// Third-party libraries
import Router from 'express'
import passport from 'passport'

// Own modules
import {
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit
} from '../middleware/eventUserChecks.js'
import {
    sanitizeInput
} from '../middleware/sanitizer.js'

// Controller functions
import {
    newCode,
    getEventAndSend,
    getEventAndAttach,
    createEvent,
    updateEvent,
    joinEvent,
    leaveEvent,
    kickUserFromEvent,
    deleteEvent,
    addUserToEventAdmins,
    removeUserFromEventAdmins
} from '../controllers/eventController.js'

// Destructuring and global variables
const router = Router()

/**
 * @route POST api/v1/events/:eventIdOrCode/new-code
 * @desc Update event with a random event code
 * @access AUTHENTICATED
*/
router.post('/:eventIdOrCode/new-code',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    getEventAndAttach,
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit,
    newCode
)

/**
 * @route GET api/v1/events/:eventId
 * @desc Get event from eventId
 * @access AUTHENTICATED
 */
router.get('/:eventIdOrCode',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    getEventAndAttach, // TODO: Fix double call to find event
    checkUserInEvent,
    getEventAndSend
)

/**
 * @route POST api/v1/events
 * @desc Create a new event, add user to event, add event to user
 * @access AUTHENTICATED
 */
router.post('/',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    createEvent
)

/**
 * @route PATCH api/v1/events/:eventIdOrCode
 * @desc Update event with provided info
 * @access AUTHENTICATED
 */
router.patch('/:eventIdOrCode',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    getEventAndAttach,
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit,
    updateEvent
)

/**
 * @route PUT /api/v1/events/:eventIdOrCode/users
 * @desc Join event. Add userId to event, add eventId to user
 * @access AUTHENTICATED
 */
router.put('/:eventIdOrCode/users',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    getEventAndAttach,
    joinEvent
)

/**
 * @route DELETE api/v1/events/:eventIdOrCode/users/:userId
 * @desc Kick user from event. Remove user from event, remove event from user. Empty events are deleted automatically in Event.js
 * @access AUTHENTICATED
 */
router.delete('/:eventIdOrCode/users/:userId',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    getEventAndAttach,
    checkUserIsAuthenticatedToEdit,
    checkUserInEvent,
    kickUserFromEvent
)

/**
 * @route DELETE api/v1/events/:eventIdOrCode/users
 * @desc Leave event. Remove user from event, remove event from user. Empty events are deleted automatically in Event.js
 * @access AUTHENTICATED
 */
router.delete('/:eventIdOrCode/users',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    getEventAndAttach,
    checkUserInEvent,
    leaveEvent
)

/**
 * @route DELETE api/v1/events/:eventIdOrCode
 * @desc Remove event for all users
 * @access AUTHENTICATED
 */
router.delete('/:eventIdOrCode',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    getEventAndAttach,
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit,
    deleteEvent
)

/**
 * @route PUT api/v1/events/:eventIdOrCode/admins/:userId
 * @desc Add admin to event
 * @access AUTHENTICATED
 */
router.put('/:eventIdOrCode/admins/:userId',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    getEventAndAttach,
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit,
    addUserToEventAdmins
)

/**
 * @route DELETE api/v1/events/:eventIdOrCode/admins/:userId
 * @desc Remove admin from event
 * @access AUTHENTICATED
 */
router.delete('/:eventIdOrCode/admins/:userId',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    getEventAndAttach,
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit,
    removeUserFromEventAdmins
)

export default router
