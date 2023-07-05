const { 
    UserNotInEventError,
    MissingFieldsError,
    EventNotFoundError,
    UserNotAdminError,
    InvalidEventIdOrCode,
} = require('../utils/errors');

const express = require('express');
const router = express.Router();

const passport = require('passport');

const Event = require('../models/Event');
const User = require('../models/User');
const validator = require('validator');
const asyncErrorHandler = require('../middleware/asyncErrorHandler');

function isMongoId(str) {
    return /^[0-9a-fA-F]{24}$/.test(str);
}

function isNanoid(str) {
    return /^[1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz]{10}$/.test(str);
}

// Get event by eventId or eventCode
async function getEvent(req, res, next) {
    const eventIdOrCode = req.eventIdOrCode;
    let query;
    if (isMongoId(eventIdOrCode)) { // It's a MongoDB ObjectId
        query = { _id: eventIdOrCode };
    } else if (isNanoid(eventIdOrCode)) { // It's a nanoid
        query = { eventCode: eventIdOrCode };
    } else {
        return next(new InvalidEventIdOrCode('The provided ID or code is not valid'));
    }

    const event = await Event.findOne(query);
    
    // Check if event exists
    if (!event) return next(new EventNotFoundError('Event not found, it might have been deleted or the Event Code (if provided) is wrong'));

    req.event = event;
    next();
}

// Check if the user is a participant of the event
function checkUserInEvent(req, res, next) {
    if (!req.event.participants.includes(req.user.id)) {
        return next(new UserNotInEventError('User not authorized to view this event'));
    }
    next();
}

// Throw error if the event is locked and user is NOT admin
function checkUserIsAdmin(req, res, next) {
    if (req.event.isLocked && !req.event.isAdmin(req.user.id)) {
        return next(new UserNotAdminError('User not authorized to edit this event'));
    }
    next();
}

/**
 * @route POST api/v1/events/:eventId/new-code
 * @desc Update event with a random event code
 * @access AUTHENTICATED
*/
router.post('/:eventId/new-code',
    passport.authenticate('jwt'),
    asyncErrorHandler(getEvent),
    checkUserInEvent,
    checkUserIsAdmin,
    asyncErrorHandler(async (req, res, next) => {
        const event = req.event;
        // Generate a new eventCode
        event.generateNewEventCode();
        return res.status(200).json(event);
    })
);

/**
 * @route GET api/v1/events/:eventId
 * @desc Get event from eventId
 * @access AUTHENTICATED
 */
router.get('/:eventId',
    passport.authenticate('jwt'),
    asyncErrorHandler(getEvent),
    checkUserInEvent,
    asyncErrorHandler(async (req, res, next) => {
        const event = req.event;
        return res.status(200).json(event);
    })
);

/**
 * @route POST api/v1/events
 * @desc Create a new event, add user to event, add event to user, add user to admins if only owner can edit event
 * @access AUTHENTICATED
 */
router.post('/',
    passport.authenticate('jwt'),
    asyncErrorHandler(async (req, res, next) => {
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
        const user = await User.findById(userId);
        const participants = user;

        let admins;
        if (isLocked == true){
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
    })
);

/**
 * @route PATCH api/v1/events/:eventId
 * @desc Update event with provided info
 * @access AUTHENTICATED
 */
router.patch('/:eventId',
    passport.authenticate('jwt'),
    asyncErrorHandler(getEvent),
    checkUserInEvent,
    checkUserIsAdmin,
    asyncErrorHandler(async (req, res, next) => {
        const {
            eventName, 
            eventDescription, 
            startDate, 
            endDate,
        } = req.body;

        const event = req.event;

        // Update the event
        if(eventName) event.eventName = eventName;
        if(eventDescription) event.eventDescription = eventDescription;
        if(startDate) event.startDate = startDate;
        if(endDate) event.endDate = endDate;

        await event.save();

        return res.status(200).json(event);
    })
);

/**
 * @route PUT /api/v1/events/:eventId/users
 * @desc Join event. Add userId to event, add eventId to user
 * @access AUTHENTICATED
 */
router.put('/:eventIdOrCode/users',
    passport.authenticate('jwt'),
    asyncErrorHandler(getEvent),
    asyncErrorHandler(async (req, res, next) => {
        const event = req.event;
        const user = req.user;

        // Add event to user's events and user to event's participants
        user.events.push(event._id);
        event.participants.push(user.id);

        await user.save();
        await event.save();

        return res.status(200).json(event);
    })
);

/**
 * @route DELETE api/v1/events/:eventIdOrCode/users
 * @desc Leave event. Remove user from event, remove event from user. Empty events are deleted automatically in Event.js
 * @access AUTHENTICATED
 */
router.delete('/:eventIdOrCode/users',
    passport.authenticate('jwt'),
    asyncErrorHandler(getEvent),
    checkUserInEvent,
    asyncErrorHandler(async (req, res, next) => {
        const user = req.user;
        const event = req.event;

        // Remove event from user's events, and user from event's participants
        user.events.pull(event.id);
        event.participants.pull(user.id);

        await user.save();
        await event.save();

        return res.status(204);
}));

/**
 * @route DELETE api/v1/events/:eventId
 * @desc Remove event for all users
 * @access AUTHENTICATED
 */
router.delete('/:eventId',
    passport.authenticate('jwt'),
    asyncErrorHandler(getEvent),
    checkUserInEvent,
    checkUserIsAdmin,
    asyncErrorHandler(async (req, res, next) => {
        req.event.delete();
        return res.status(204);
}));

module.exports = router;