// Node.js built-in modules

// Third-party libraries
import { type NextFunction, type Request } from 'express'

// Own modules
import UserModel, { type IUser } from '../models/User.js'
import { InvalidParametersError, MissingFieldsError } from '../utils/errors.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'

// Destructuring and global variables

// Helper Function to Generate Date Range
function getDatesInRange (startDate: Date, endDate: Date) {
    const dates = []
    const currentDate = new Date(startDate.getTime())

    while (currentDate <= endDate) {
        // Normalize date to the start of the day
        dates.push(new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate())))
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    }

    return dates
}

// Common validation function
function validateDateRange (req: Request, next: NextFunction): [Date | null, Date | null] {
    const { fromDate: fromDateString, toDate: toDateString } = req.params

    if (fromDateString === null || fromDateString === undefined || toDateString === undefined) {
        next(new MissingFieldsError('Missing required fields: "fromDate" and/or "toDate"'))
        return [null, null]
    }

    const fromDate = new Date(fromDateString)
    const toDate = new Date(toDateString)

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        next(new InvalidParametersError('Invalid date format. Please use valid dates'))
        return [null, null]
    }

    if (fromDate.getTime() > toDate.getTime()) {
        next(new InvalidParametersError('fromDate must be earlier than toDate'))
        return [null, null]
    }

    return [fromDate, toDate]
}

export const newBlockedDate = asyncErrorHandler(async (req, res, next) => {
    const user = req.user as IUser
    const [fromDate, toDate] = validateDateRange(req, next)

    if (!fromDate || !toDate) return

    const dateRange = getDatesInRange(fromDate, toDate)
    const updates = dateRange.filter(date =>
        !user.blockedDates.some((d: Date) =>
            new Date(d).setHours(0, 0, 0, 0) === date.getTime()
        )
    )

    if (updates.length > 0) {
        await UserModel.findByIdAndUpdate(user._id, { $addToSet: { blockedDates: { $each: updates } } })
    }

    res.status(201).json({ message: 'Blocked dates added successfully.' })
})

export const deleteBlockedDate = asyncErrorHandler(async (req, res, next) => {
    const user = req.user as IUser
    const [fromDate, toDate] = validateDateRange(req, next)

    if (!fromDate || !toDate) return

    const dateRange = getDatesInRange(fromDate, toDate)
    const updates = dateRange.filter(dateRangeItem =>
        user.blockedDates.some(blockedDate =>
            new Date(blockedDate).setHours(0, 0, 0, 0) === new Date(dateRangeItem).setHours(0, 0, 0, 0)
        )
    )

    if (updates.length > 0) {
        await UserModel.findByIdAndUpdate(user._id, { $pullAll: { blockedDates: updates } })
    }

    res.status(200).json({ message: 'Blocked dates deleted successfully.' })
})
