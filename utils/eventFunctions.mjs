import errors from '../utils/errors.mjs';
import Event from '../models/Event.mjs';

const {
    EventNotFoundError,
    InvalidEventIdOrCode,
} = errors;

// helper functions
function isMongoId(str) {
    return /^[0-9a-fA-F]{24}$/.test(str);
}

function isNanoid(str) {
    return /^[1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz]{10}$/.test(str);
}

// Get event by eventId or eventCode
export async function getEvent(eventIdOrCode) {
    let query;
    if (isMongoId(eventIdOrCode)) { // It's a MongoDB ObjectId
        query = { _id: eventIdOrCode };
    } else if (isNanoid(eventIdOrCode)) { // It's a nanoid
        query = { eventCode: eventIdOrCode };
    } else {
        return next(new InvalidEventIdOrCode('The provided ID or code is not valid'));
    }

    const event = await Event.findOne(query).exec();
    
    // Check if event exists
    if (!event) return next(new EventNotFoundError('Event not found, it might have been deleted or the Event Code (if provided) is wrong'));

    return event;
}