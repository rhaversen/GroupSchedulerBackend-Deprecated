// Node.js built-in modules
import config from 'config'

// Third-party libraries
import { type Request, type Response, type NextFunction } from 'express'

// Own modules
import logger from '../utils/logger.js'
import errors from '../utils/errors.js'
import Event, { IEvent } from '../models/Event.js'
import User, { IUser } from '../models/User.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'

// Destructuring and global variables
const {
    MissingFieldsError,
    UserNotAdminError,
    EventNotFoundError,
    InvalidEventIdOrCode
} = errors

// Config
const nanoidAlphabet = String(config.get('nanoid.alphabet'))
const nanoidLength = Number(config.get('nanoid.length'))

// helper functions
function isMongoId (str: string) {
    return /^[0-9a-fA-F]{24}$/.test(str)
}
function isNanoid (str: string) {
    const regex = new RegExp(`^[${nanoidAlphabet}]{${nanoidLength}}$`)
    return regex.test(str)
}

// Get event by eventId or eventCode
export async function getEventByIdOrCode (eventIdOrCode: string) {
    let query
    if (isMongoId(eventIdOrCode)) { // It's a MongoDB ObjectId
        query = { _id: eventIdOrCode }
    } else if (isNanoid(eventIdOrCode)) { // It's a nanoid
        query = { eventCode: eventIdOrCode }
    } else {
        throw new InvalidEventIdOrCode('The provided ID or code is not valid')
    }

    const event = await Event.findOne(query).exec()

    // Check if event exists
    if (!event) throw new EventNotFoundError('Event not found, it might have been deleted or the Event Code (if provided) is wrong')

    return event
}

export const newCode = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)

    // Generate a new eventCode
    event.generateNewEventCode()
    res.status(200).json(event.eventCode)
})

export const getEvent = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)
    res.status(200).json(event)
})

export const createEvent = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
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
        return next(new MissingFieldsError('Missing required fields'))
    }

    const participants = req.user

    let admins
    if (isLocked) {
        admins = participants
    }

    const newEvent = new Event({
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

export const updateEvent = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export const joinEvent = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)
    const user = req.user

    // Add event to user's events and user to event's participants
    user.events.push(event._id)
    event.participants.push(user.id)

    await user.save()
    await event.save()

    res.status(200).json(event)
})

export const leaveEventOrKick = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)
    const user = req.user

    // The optional userId param is for kicking users out of events
    const removedUserId = req.params.userId // Kicked users will be able to join again if the event code isn't changed
    if (removedUserId) { // User deletion requested
        if (!(event.isLocked && !event.isAdmin(user.id))) { // The event is either not locked, or the user is admin
            const removedUser = await User.findById(removedUserId).exec()
            if (removedUser) {
                removedUser.events.pull(event.id)
                await removedUser.save()
            }

            event.participants.pull(removedUserId)

            await user.save()
            await event.save()

            res.status(204); return
        } // Event is locked and user is not admin
        return next(new UserNotAdminError('Only admins can kick users'))
    }

    // Remove event from user's events, and user from event's participants
    user.events.pull(event.id)
    event.participants.pull(user.id)

    // Remove user from admins if user is admin
    if (event.isAdmin(user.id)) {
        event.admins.pull(user.id)
    }

    await user.save()
    await event.save()

    res.status(204)
})

export const deleteEvent = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
    const eventIdOrCode = req.params.eventIdOrCode
    const event = await getEventByIdOrCode(eventIdOrCode)
    event.delete()
    res.status(204)
})
