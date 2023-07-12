// Node.js built-in modules

// Third-party libraries
import { Router } from 'express';
import passport from 'passport';

// Own modules
import errors from '../utils/errors.mjs';
import logger from '../utils/logger.mjs';
import Event from '../models/Event.mjs';
import User from '../models/User.mjs';
import {
    getEvent,
    checkUserInEvent,
    checkUserIsAdmin
} from '../middleware/eventFunctions.mjs';
import {
    sanitizeInput,
  } from '../middleware/sanitizer.mjs';

// Destructuring and global variables
const {
    MissingFieldsError,
} = errors;
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
    async (req, res, next) => {
        const eventIdOrCode = req.params.eventIdOrCode;
        const event = await getEvent(eventIdOrCode);
        
        // Generate a new eventCode
        event.generateNewEventCode();
        return res.status(200).json(event.eventCode);
    }
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
    async (req, res, next) => {
        const eventIdOrCode = req.params.eventIdOrCode;
        const event = await getEvent(eventIdOrCode);
        return res.status(200).json(event);
    }
);

/**
 * @route POST api/v1/events
 * @desc Create a new event, add user to event, add event to user, add user to admins if only owner can edit event
 * @access AUTHENTICATED
 */
router.post('/',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    async (req, res, next) => {
        const { 
            eventName, 
            eventDescription, 
            startDate, 
            endDate,
            isLocked,
        } = req.body;

        // Checks if eventName, startDate, and endDate are not falsy (e.g., undefined, null, empty string)
        // and if isLocked is not undefined
        if (!eventName || !startDate || !endDate || isLocked === undefined) {
            return next(new MissingFieldsError('Missing required fields'));
        }

        const userId = req.user.id;
        const user = await User.findById(userId).exec();
        const participants = user;

        let admins;
        if (isLocked){
            admins = user;
        }

        const newEvent = new Event({
            eventName, 
            eventDescription, 
            startDate, 
            endDate,
            participants,
            admins,
        });

        await newEvent.save();

        return res.status(201).json(newEvent);
    }
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
    async (req, res, next) => {
        const {
            eventName, 
            eventDescription, 
            startDate, 
            endDate,
        } = req.body;

        const eventIdOrCode = req.params.eventIdOrCode;
        const event = await getEvent(eventIdOrCode)

        // Update the event
        if(eventName) event.eventName = eventName;
        if(eventDescription) event.eventDescription = eventDescription;
        if(startDate) event.startDate = startDate;
        if(endDate) event.endDate = endDate;

        await event.save();

        return res.status(200).json(event);
    }
);

/**
 * @route PUT /api/v1/events/:eventIdOrCode/users
 * @desc Join event. Add userId to event, add eventId to user
 * @access AUTHENTICATED
 */
router.put('/:eventIdOrCode/users',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    async (req, res, next) => {
        const eventIdOrCode = req.params.eventIdOrCode;
        const event = getEvent(eventIdOrCode)
        const user = req.user;

        // Add event to user's events and user to event's participants
        user.events.push(event._id);
        event.participants.push(user.id);

        await user.save();
        await event.save();

        return res.status(200).json(event);
    }
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
    async (req, res, next) => {
        const eventIdOrCode = req.params.eventIdOrCode;
        const event = await getEvent(eventIdOrCode);
        const user = req.user;

        // Remove event from user's events, and user from event's participants
        user.events.pull(event.id);
        event.participants.pull(user.id);

        await user.save();
        await event.save();

        return res.status(204);
    }
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
    async (req, res, next) => {
        const eventIdOrCode = req.params.eventIdOrCode;
        const event = await getEvent(eventIdOrCode);
        event.delete();
        return res.status(204);
    }
);

export default router;