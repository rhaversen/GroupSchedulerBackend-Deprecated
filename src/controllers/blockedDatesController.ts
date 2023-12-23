// Node.js built-in modules

// Third-party libraries
import { type NextFunction, type Request, type Response } from 'express'

// Own modules
import UserModel, { type IUser } from '../models/User.js'
import { InvalidParametersError, MissingFieldsError } from '../utils/errors.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'

// Destructuring and global variables

// Helper Function to Generate Date Range
function getDatesInRange (startDate: Date, endDate: Date): Date[] {
    const dates = []
    const currentDate = startDate

    while (currentDate <= endDate) {
        dates.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
    }

    return dates
}

// Common validation function
function validateDateRange (req: Request, next: NextFunction): [Date | null, Date | null] {
    const { fromDate: fromDateString, toDate: toDateString } = req.params

    if (!fromDateString || !toDateString) {
        next(new MissingFieldsError('Missing required fields: "fromDate" and/or "toDate"'))
        return [null, null]
    }

    const fromDate = new Date(fromDateString)
    const toDate = new Date(toDateString)

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        next(new InvalidParametersError('Invalid date format. Please use valid dates'))
        return [null, null]
    }

    return [fromDate, toDate]
}

export const newBlockedDate = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const [fromDate, toDate] = validateDateRange(req, next)

    if (!fromDate || !toDate) return

    const dateRange = getDatesInRange(fromDate, toDate)
    const updates = []

    for (const date of dateRange) {
        if (!user.blockedDates.some(d => d.toISOString() === date.toISOString())) {
            updates.push(date)
        }
    }

    if (updates.length > 0) {
        await UserModel.findByIdAndUpdate(user._id, { $addToSet: { blockedDates: { $each: updates } } }).exec()
    }

    res.status(201).json({ message: 'Blocked dates added successfully.' })
})

export const deleteBlockedDate = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const [fromDate, toDate] = validateDateRange(req, next)

    if (!fromDate || !toDate) return

    const dateRange = getDatesInRange(fromDate, toDate)
    const updates = []

    for (const date of dateRange) {
        if (user.blockedDates.some(d => d.toISOString() === date.toISOString())) {
            updates.push(date)
        }
    }

    if (updates.length > 0) {
        await UserModel.findByIdAndUpdate(user._id, { $pullAll: { blockedDates: updates } }).exec()
    }

    res.status(200).json({ message: 'Blocked dates deleted successfully.' })
})
