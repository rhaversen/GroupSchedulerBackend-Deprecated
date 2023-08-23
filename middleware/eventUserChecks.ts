// Third-party libraries
import { type Request, type Response, type NextFunction } from 'express'

// Own modules
import errors from '../utils/errors.js'

const {
    UserNotInEventError,
    UserNotAdminError
} = errors

// Check if the user is a participant of the event
export function checkUserInEvent (req: Request, res: Response, next: NextFunction): void {
    if (!req.event.participants.includes(req.user.id)) {
        return next(new UserNotInEventError('User not authorized to view this event'))
    }
    next()
}

// Throw error if the event is locked and user is NOT admin
export function checkUserIsAdmin (req: Request, res: Response, next: NextFunction): void {
    if (req.event.isLocked && !req.event.isAdmin(req.user.id)) {
        return next(new UserNotAdminError('User not authorized to edit this event'))
    }
    next()
}
