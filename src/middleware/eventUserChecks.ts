// Third-party libraries
import { type NextFunction, type Request, type Response } from 'express'

// Own modules
import { UserNotAdminError, UserNotInEventError } from '../utils/errors.js'
import { type IRequestWithEvent } from '../controllers/eventController.js'
import { type IUser } from '../models/User.js'

// Check if the user is a participant of the event
export function checkUserInEvent (req: Request, res: Response, next: NextFunction): void {
    const requestWithEvent = req as IRequestWithEvent
    if (!requestWithEvent.event.participants.includes((req.user as IUser)._id)) {
        next(new UserNotInEventError('User not authorized to view this event'))
        return
    }
    next()
}

// Throw error if the event is locked and user is NOT admin
export function checkUserIsAuthenticatedToEdit (req: Request, res: Response, next: NextFunction): void {
    const requestWithEvent = req as IRequestWithEvent
    const userId = (req.user as IUser)._id
    if (requestWithEvent.event.adminLocked && !(requestWithEvent.event.isOwner(userId) || requestWithEvent.event.isAdmin(userId))) {
        next(new UserNotAdminError('User not authorized to edit this event'))
    } else {
        next()
    }
}
