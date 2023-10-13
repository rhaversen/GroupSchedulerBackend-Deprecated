// Node.js built-in modules

// Third-party libraries
import { type Request, type Response, type NextFunction } from 'express'

// Own modules
import logger from '../utils/logger.js'
import {
    MissingFieldsError,
    UserNotAdminError,
    EventNotFoundError,
    InvalidEventIdOrCode
} from '../utils/errors.js'
import EventModel, { type IEvent } from '../models/Event.js'
import UserModel, { type IUser } from '../models/User.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'
import {
    getNanoidAlphabet,
    getNanoidLength
} from '../utils/setupConfig.js'

// Destructuring and global variables

// Config
const nanoidAlphabet = getNanoidAlphabet()
const nanoidLength = getNanoidLength()

// Interfaces
export interface IRequestWithEvent extends Request {
    event: IEvent
}

// helper functions
function isMongoId (str: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(str)
}
function isNanoid (str: string): boolean {
    const regex = new RegExp(`^[${nanoidAlphabet}]{${nanoidLength}}$`)
    return regex.test(str)
}

// Get event by eventId or eventCode
export async function getEventByIdOrCode (eventIdOrCode: string): Promise<IEvent> {
    let query
    if (isMongoId(eventIdOrCode)) { // It's a MongoDB ObjectId
        query = { _id: eventIdOrCode }
    } else if (isNanoid(eventIdOrCode)) { // It's a nanoid
        query = { eventCode: eventIdOrCode }
    } else {
        throw new InvalidEventIdOrCode('The provided ID or code is not valid')
    }

    const event = await EventModel.findOne(query).exec()

    // Check if event exists
    if (event === null) throw new EventNotFoundError('Event not found, it might have been deleted or the Event Code (if provided) is wrong')

    return event
}

export const newCode = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)

    // Generate a new eventCode
    await event.generateNewEventCode()
    res.status(200).json(event.eventCode)
})

export const getEventAndSend = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)
    res.status(200).json(event)
})

export const getEventAndAttach = asyncErrorHandler<IRequestWithEvent>(
    async (req: IRequestWithEvent, res: Response, next: NextFunction): Promise<void> => {
        const eventIdOrCode = req.params.eventIdOrCode
        req.event = await getEventByIdOrCode(eventIdOrCode)
        next()
    })

export const createEvent = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
        eventName,
        eventDescription,
        startDate,
        endDate,
        isLocked
    } = req.body

    // Checks if eventName, startDate, and endDate are not falsy (e.g., undefined, null, empty string)
    // and if isLocked is not undefined
    if (!eventName || !startDate || !endDate || isLocked === undefined) {
        next(new MissingFieldsError('Missing required fields')); return
    }

    const participants = req.user

    let admins
    if (isLocked === 'true') {
        admins = participants
    }

    const newEvent = new EventModel({
        eventName,
        eventDescription,
        startDate,
        endDate,
        participants,
        admins
    })

    await newEvent.save()

    res.status(201).json(newEvent)
})

export const updateEvent = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
        eventName,
        eventDescription,
        startDate,
        endDate
    } = req.body

    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)

    // Update the event
    if (eventName) event.eventName = eventName
    if (eventDescription) event.eventDescription = eventDescription
    if (startDate) event.startDate = startDate
    if (endDate) event.endDate = endDate

    await event.save()

    res.status(200).json(event)
})

export const joinEvent = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)
    const user = req.user as IUser

    // Add event to user's events and user to event's participants
    await Promise.all([
        UserModel.findByIdAndUpdate(user._id, { $pull: { events: { $in: [event._id] } } }).exec(),
        EventModel.findByIdAndUpdate(event._id, { $pull: { participants: { $in: [user._id] } } }).exec()
    ])

    res.status(200).json(event)
})

export const leaveEventOrKick = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)
    const user = req.user as IUser

    // The optional userId param is for kicking users out of events
    const removedUserId = req.params.userId // Kicked users will be able to join again if the event code isn't changed
    if (removedUserId) { // User deletion requested
        if (!(event.isLocked() && !event.isAdmin(user._id))) { // The event is either not locked, or the user is admin
            const removedUser = await UserModel.findById(removedUserId).exec()
            if (removedUser) {
                await UserModel.findByIdAndUpdate(removedUserId, { $pull: { events: event._id } }).exec()
            }
            await EventModel.findByIdAndUpdate(event._id, { $pull: { participants: removedUserId } }).exec()

            res.status(204); return
        } // Event is locked and user is not admin
        next(new UserNotAdminError('Only admins can kick users')); return
    }

    // Remove event from user's events, and user from event's participants
    await Promise.all([
        UserModel.findByIdAndUpdate(user._id, { $pull: { events: { $in: [event._id] } } }).exec(),
        EventModel.findByIdAndUpdate(event._id, { $pull: { participants: { $in: [user._id] } } }).exec()
    ])

    // Remove user from admins if user is admin
    if (event.isAdmin(user.id)) {
        await EventModel.findByIdAndUpdate(event._id, { $pull: { admins: user._id } }).exec()
    }

    res.status(204)
})

export const deleteEvent = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)
    EventModel.findByIdAndDelete(event._id)
    res.status(204)
})