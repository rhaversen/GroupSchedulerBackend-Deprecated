// Node.js built-in modules

// Third-party libraries
import { type NextFunction, type Request, type Response } from 'express'

// Own modules
import UserModel, { type IUser } from '../models/User.js'
import { InvalidParametersError, MissingFieldsError } from '../utils/errors.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'

// Destructuring and global variables

// Common validation function
function validateDate (req: Request, next: NextFunction): Date | null {
    const { date: dateString } = req.params

    if (dateString === null || dateString === undefined) {
        next(new MissingFieldsError('Missing required field: "date"'))
        return null
    }

    const dateObj = new Date(dateString)
    if (Number.isNaN(dateObj.getTime())) {
        next(new InvalidParametersError('Invalid date format. Please use a valid date'))
        return null
    }

    return dateObj
}

export const newBlockedDate = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const dateObj = validateDate(req, next)

    if (dateObj === null || dateObj === undefined) return

    const dateExists = user.blockedDates.some(date => date.toISOString() === dateObj.toISOString())
    if (dateExists) {
        next(new InvalidParametersError('Blocked date already exists'))
        return
    }

    // Add blocked date to the user's blocked date array
    await UserModel.findByIdAndUpdate(user._id, { $addToSet: { blockedDates: dateObj } }).exec()
    res.status(201).json(dateObj)
})

export const deleteBlockedDate = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const dateObj = validateDate(req, next)

    if (dateObj === null || dateObj === undefined) return

    const dateExists = user.blockedDates.some(date => date.toISOString() === dateObj.toISOString())
    if (!dateExists) {
        next(new InvalidParametersError('Blocked date does not exist'))
        return
    }

    // Remove the blocked date from the user's blocked date array
    await UserModel.findByIdAndUpdate(user._id, { $pull: { blockedDates: dateObj } })

    res.status(200).json({ message: 'Blocked date deleted successfully.' })
})
