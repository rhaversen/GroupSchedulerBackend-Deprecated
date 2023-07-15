import errors from '../utils/errors.mjs';

const {
    UserNotInEventError,
    UserNotAdminError,
} = errors;

// Check if the user is a participant of the event
export function checkUserInEvent(req, res, next) {
    if (!req.event.participants.includes(req.user.id)) {
        return next(new UserNotInEventError('User not authorized to view this event'));
    }
    next();
}

// Throw error if the event is locked and user is NOT admin
export function checkUserIsAdmin(req, res, next) {
    if (req.event.isLocked && !req.event.isAdmin(req.user.id)) {
        return next(new UserNotAdminError('User not authorized to edit this event'));
    }
    next();
}