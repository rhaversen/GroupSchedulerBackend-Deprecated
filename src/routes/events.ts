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
import { 
    ensureAuthenticated 
} from '../utils/passportConfig.js'

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
 * @access Authenticated
*/
router.post('/:eventIdOrCode/new-code',
    sanitizeInput,
    ensureAuthenticated,
    getEventAndAttach,
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit,
    newCode
)

/**
 * @route GET api/v1/events/:eventId
 * @desc Get event from eventId
 * @access Authenticated
 */
router.get('/:eventIdOrCode',
    sanitizeInput,
    ensureAuthenticated,
    getEventAndAttach, // TODO: Fix double call to find event
    checkUserInEvent,
    getEventAndSend
)

/**
 * @route POST api/v1/events
 * @desc Create a new event, add user to event, add event to user
 * @access Authenticated
 */
router.post('/',
    sanitizeInput,
    ensureAuthenticated,
    createEvent
)

/**
 * @route PATCH api/v1/events/:eventIdOrCode
 * @desc Update event with provided info
 * @access Authenticated
 */
router.patch('/:eventIdOrCode',
    sanitizeInput,
    ensureAuthenticated,
    getEventAndAttach,
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit,
    updateEvent
)

/**
 * @route PUT /api/v1/events/:eventIdOrCode/users
 * @desc Join event. Add userId to event, add eventId to user
 * @access Authenticated
 */
router.put('/:eventIdOrCode/users',
    sanitizeInput,
    ensureAuthenticated,
    getEventAndAttach,
    joinEvent
)

/**
 * @route DELETE api/v1/events/:eventIdOrCode/users/:userId
 * @desc Kick user from event. Remove user from event, remove event from user. Empty events are deleted automatically in Event.js
 * @access Authenticated
 */
router.delete('/:eventIdOrCode/users/:userId',
    sanitizeInput,
    ensureAuthenticated,
    getEventAndAttach,
    checkUserIsAuthenticatedToEdit,
    checkUserInEvent,
    kickUserFromEvent
)

/**
 * @route DELETE api/v1/events/:eventIdOrCode/users
 * @desc Leave event. Remove user from event, remove event from user. Empty events are deleted automatically in Event.js
 * @access Authenticated
 */
router.delete('/:eventIdOrCode/users',
    sanitizeInput,
    ensureAuthenticated,
    getEventAndAttach,
    checkUserInEvent,
    leaveEvent
)

/**
 * @route DELETE api/v1/events/:eventIdOrCode
 * @desc Remove event for all users
 * @access Authenticated
 */
router.delete('/:eventIdOrCode',
    sanitizeInput,
    ensureAuthenticated,
    getEventAndAttach,
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit,
    deleteEvent
)

/**
 * @route PUT api/v1/events/:eventIdOrCode/admins/:userId
 * @desc Add admin to event
 * @access Authenticated
 */
router.put('/:eventIdOrCode/admins/:userId',
    sanitizeInput,
    ensureAuthenticated,
    getEventAndAttach,
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit,
    addUserToEventAdmins
)

/**
 * @route DELETE api/v1/events/:eventIdOrCode/admins/:userId
 * @desc Remove admin from event
 * @access Authenticated
 */
router.delete('/:eventIdOrCode/admins/:userId',
    sanitizeInput,
    ensureAuthenticated,
    getEventAndAttach,
    checkUserInEvent,
    checkUserIsAuthenticatedToEdit,
    removeUserFromEventAdmins
)

export default router
