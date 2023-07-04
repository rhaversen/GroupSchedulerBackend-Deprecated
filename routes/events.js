const { 
    EventCodeError,
    UserNotInEventError,
    MissingFieldsError,
    UserExistsError,
    EventExistsError,
    UserInEventError,
} = require('../utils/errors');

const express = require('express');
const router = express.Router();

const passport = require('passport');

const Event = require('../models/Event');
const User = require('../models/User');
const validator = require('validator');
const asyncErrorHandler = require('../middleware/asyncErrorHandler');

/**
 * @route POST api/v1/events/:eventId/new-code
 * @desc Update event with a random event code
 * @access AUTHENTICATED
*/
router.post('/:eventId/new-code', passport.authenticate('jwt'), asyncErrorHandler(async (req, res, next) => {
    const userId = req.user.id;
    const eventId = req.params.eventId;

    try {
        // Find the event by its id
        const event = await Event.findById(eventId);

        // Check if event exists
        if (!event) {
            return next(new EventCodeError('Event not found, it might have been deleted'));
        }

        // Check if the user is a participant of the event
        if (!event.participants.includes(userId)) {
            return next(new UserNotInEventError('User not authorized to update this event'));
        }

        // Generate a new eventCode
        event.generateNewEventCode();

        return res.status(200).json(event);
    } catch (error) {
        return next(error);
    }
}));

/**
 * @route GET api/v1/events/:eventId
 * @desc Get the event from the eventId
 * @access AUTHENTICATED
 */
router.get('/:eventId', passport.authenticate('jwt'), asyncErrorHandler(async (req, res, next) => {
    const userId = req.user.id;
    const eventId = req.params.eventId;

    try {
        // Find the event by its id
        const event = await Event.findById(eventId);

        // Check if event exists
        if (!event) {
            return next(new EventCodeError('Event not found, it might have been deleted'));
        }

        // Check if the user is a participant of the event
        if (!event.participants.includes(userId)) {
            return next(new UserNotInEventError('User not authorized to view this event'));
        }

        return res.status(200).json(event);
    } catch (error) {
        return next(error);
    }
}));

/**
 * @route POST api/v1/events
 * @desc Create a new event, add user to event, add event to user
 * @access AUTHENTICATED
 */
router.post('/', passport.authenticate('jwt'), asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const participants = await User.findById(userId);

        const { 
            eventName, 
            eventDescription, 
            startDate, 
            endDate,
        } = req.body;

        if (!eventName || !startDate || !endDate) {
            return next(new MissingFieldsError('Missing required fields'));
        }

        const newEvent = new Event({
            eventName, 
            eventDescription, 
            startDate, 
            endDate,
            participants,
        });

        await newEvent.save();

        return res.status(201).json(newEvent);
    } catch (error) {
        return next(error);
    }
}));

/**
 * @route PATCH api/v1/events/:eventId
 * @desc Update event with provided info
 * @access AUTHENTICATED
 */
router.patch('/:eventId', passport.authenticate('jwt'), asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.eventId;

        const user = await User.findById(userId);
        const event = await Event.findById(eventId);

        const {
            eventName, 
            eventDescription, 
            startDate, 
            endDate,
        } = req.body;

        if (!user) {
            return next(new UserExistsError('User not found, it might have been deleted'));
        } else if (!event) {
            return next(new EventExistsError('Event not found, the Event Code might be incorrect'));
        }

        // Check if the user is a participant of the event
        if (!event.participants.includes(req.user.id)) {
            return next(new UserNotInEventError('User is not in this this event'));
        }

        // Update the event
        if(eventName) event.eventName = eventName;
        if(eventDescription) event.eventDescription = eventDescription;
        if(startDate) event.startDate = startDate;
        if(endDate) event.endDate = endDate;

        await event.save();

        return res.status(200).json(event);
    } catch (error) {
        return next(error);
    }
}));

/**
 * @route PUT api/v1/events/:eventCode/user
 * @desc Join event with eventCode, add userId to event, add eventId to user
 * @access AUTHENTICATED
 */
router.put('/:eventCode/user', passport.authenticate('jwt'), asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const eventCode = req.params.eventCode;

        const user = await User.findById(userId);
        const event = await Event.findOne({eventCode: eventCode});

        if (!user) {
            return next(new UserExistsError('User not found, it might have been deleted'));
        } else if (!event) {
            return next(new UserExistsError('Event not found, the Event Code might be incorrect'));
        }

        // Add event to user's events and user to event's participants
        user.events.push(event.eventId);
        event.participants.push(userId);

        await user.save();
        await event.save();

        return res.status(200).json(event);
    } catch (error) {
        return next(error);
    }
}));

/**
 * @route PUT /api/v1/events/:eventId/user
 * @desc Add userId to event, add eventId to user
 * @access AUTHENTICATED
 */
router.put('/:eventId/user', passport.authenticate('jwt'), asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.eventId;

        const user = await User.findById(userId);
        const event = await Event.findById(eventId);

        if (!user) {
            return next(new UserExistsError('User not found, it might have been deleted'));
        } else if (!event) {
            return next(new UserExistsError('Event not found, the Event Code might be incorrect'));
        }

        // Add event to user's events and user to event's participants
        user.events.push(eventId);
        event.participants.push(userId);

        await user.save();
        await event.save();

        return res.status(200).json(event);
    } catch (error) {
        return next(error);
    }
}));

/**
 * @route DELETE api/v1/events/:eventId/users/:userId
 * @desc Remove user from event, remove event from user. Empty events are deleted automatically
 * @access AUTHENTICATED
 */
router.delete('/:eventId/users/:userId', passport.authenticate('jwt'), asyncErrorHandler(async (req, res, next) => {
    try {
        const eventId = req.params.eventId;
        const userId = req.params.userId;

        const event = await Event.findById(eventId);
        const user = await User.findById(userId);

        if (!user) {
            return next(new UserExistsError('The user couldnt be found, it might have been deleted'));
        } else if (!event) {
            return next(new UserExistsError('The event couldnt be found, the Event Code might be incorrect'));
        }

        // Check if the user is a participant of the event
        if (!event.participants.includes(req.user._id)) {
            return next(new UserNotInEventError('User is not in this this event'));
        }

        // Remove event from user's events and user from event's participants
        user.events.pull(eventId);
        event.participants.pull(userId);

        await user.save();
        await event.save();

        return res.status(204);
    } catch (error) {
        return next(error);
    }
}));

/**
 * @route DELETE api/v1/events/:eventId
 * @desc Remove event for all users
 * @access AUTHENTICATED
 */
router.delete('/:eventId', passport.authenticate('jwt'), asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.eventId;

        const user = await User.findById(userId);
        const event = await Event.findById(eventId);

        if (!user) {
            return next(new UserExistsError('User not found, it might have been deleted'));
        } else if (!event) {
            return next(new UserExistsError('Event not found, the Event Code might be incorrect'));
        }

        // Check if the user is a participant of the event
        if (!event.participants.includes(req.user._id)) {
            return next(new UserNotInEventError('User not authorized to delete this event'));
        }

        event.delete();

        return res.status(204);
    } catch (error) {
        return next(error);
    }
}));

module.exports = router;