// Third-party libraries
import { type Request, type Response, type NextFunction } from 'express'

// Own modules
import errors from '../utils/errors.js'
import { type IRequestWithEvent } from '../controllers/eventController.js'
import { type IUser } from '../models/User.js'

const {
    UserNotInEventError,
    UserNotAdminError
} = errors

// Check if the user is a participant of the event
export function checkUserInEvent (req: Request, res: Response, next: NextFunction): void {
    const requestWithEvent = req as IRequestWithEvent
    if (!requestWithEvent.event.participants.includes((req.user as IUser)._id)) {
        next(new UserNotInEventError('User not authorized to view this event')); return
    }
    next()
}

// Throw error if the event is locked and user is NOT admin
export function checkUserIsAdmin (req: Request, res: Response, next: NextFunction): void {
    const requestWithEvent = req as IRequestWithEvent
    if (requestWithEvent.event.isLocked() && !requestWithEvent.event.isAdmin((req.user as IUser)._id)) {
        next(new UserNotAdminError('User not authorized to edit this event')); return
    }
    next()
}
