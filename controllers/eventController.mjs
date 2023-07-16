// Own modules
import logger from '../utils/logger.mjs';
import errors from '../utils/errors.mjs';
import Event from '../models/Event.mjs';
import User from '../models/User.mjs';
import {
    getEventByIdOrCode
} from '../utils/eventFunctions.mjs';

// Destructuring and global variables
const {
    MissingFieldsError,
} = errors;

export const newCode = async (req, res, next) => {
    const eventIdOrCode = req.params.eventIdOrCode;
    const event = await getEventByIdOrCode(eventIdOrCode);
    
    // Generate a new eventCode
    event.generateNewEventCode();
    return res.status(200).json(event.eventCode);
}

export const getEvent = async (req, res, next) => {
    const eventIdOrCode = req.params.eventIdOrCode;
    const event = await getEventByIdOrCode(eventIdOrCode);
    return res.status(200).json(event);
}

export const createEvent = async (req, res, next) => {
    const { 
        eventName, 
        eventDescription, 
        startDate, 
        endDate,
        isLocked
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
        admins
    });

    await newEvent.save();

    return res.status(201).json(newEvent);
}

export const updateEvent = async (req, res, next) => {
    const {
        eventName, 
        eventDescription, 
        startDate, 
        endDate
    } = req.body;

    const eventIdOrCode = req.params.eventIdOrCode;
    const event = await getEventByIdOrCode(eventIdOrCode)

    // Update the event
    if(eventName) event.eventName = eventName;
    if(eventDescription) event.eventDescription = eventDescription;
    if(startDate) event.startDate = startDate;
    if(endDate) event.endDate = endDate;

    await event.save();

    return res.status(200).json(event);
}

export const joinEvent = async (req, res, next) => {
    const eventIdOrCode = req.params.eventIdOrCode;
    const event = getEventByIdOrCode(eventIdOrCode)
    const user = req.user;

    // Add event to user's events and user to event's participants
    user.events.push(event._id);
    event.participants.push(user.id);

    await user.save();
    await event.save();

    return res.status(200).json(event);
}

export const leaveEvent = async (req, res, next) => {
    const eventIdOrCode = req.params.eventIdOrCode;
    const event = await getEventByIdOrCode(eventIdOrCode);
    const user = req.user;

    // Remove event from user's events, and user from event's participants
    user.events.pull(event.id);
    event.participants.pull(user.id);

    await user.save();
    await event.save();

    return res.status(204);
}

export const deleteEvent = async (req, res, next) => {
    const eventIdOrCode = req.params.eventIdOrCode;
    const event = await getEventByIdOrCode(eventIdOrCode);
    event.delete();
    return res.status(204);
}