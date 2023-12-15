// Node.js built-in modules

// Third-party libraries
import { type NextFunction, type Request, type Response } from 'express'

// Own modules
import AvailabilityModel, { type IAvailability } from '../models/Availability.js'
import UserModel, { type IUser, type IUserPopulated } from '../models/User.js'
import { InvalidParametersError, MissingFieldsError } from '../utils/errors.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'

// Destructuring and global variables

export const newOrUpdateAvailability = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
        description,
        startDate,
        endDate,
        status,
        preference
    } = req.body

    const availabilityId = req.params.id

    // Checks if description, date, status and preference are not falsy (e.g., undefined, null, empty string)
    if (!availabilityId || !startDate || !endDate || !status) {
        next(new MissingFieldsError('Missing required field(s): "availabilityId", "startDate", "endDate" or "status" '))
        return
    }

    // Check if user already has a availability set for this date
    const user = req.user as IUser

    const existingAvailability = await AvailabilityModel.findById(availabilityId).exec() as IAvailability

    if (existingAvailability) { // Check if availability is truthy
        // Availability exists, update the provided fields instead
        existingAvailability.description = description || existingAvailability.description
        existingAvailability.startDate = startDate
        existingAvailability.endDate = endDate
        existingAvailability.status = status
        existingAvailability.preference = preference || existingAvailability.preference
        const savedAvailability = await existingAvailability.save()
        res.status(201).json(savedAvailability)
        return
    } // Availability is new, all fields are therefore required

    const newAvailability = new AvailabilityModel({
        description,
        startDate,
        endDate,
        status,
        preference
    }) as IAvailability

    const savedAvailability = await newAvailability.save()

    await UserModel.findByIdAndUpdate(user._id, { $addToSet: { availabilities: savedAvailability._id } }).exec()

    res.status(201).json(savedAvailability)
})

export const getAvailabilities = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { fromDate, toDate } = req.params
    const user = req.user as IUser

    // Validate date strings
    const fromDateObj = new Date(fromDate)
    const toDateObj = new Date(toDate)

    if (Number.isNaN(fromDateObj.getTime()) || Number.isNaN(toDateObj.getTime())) {
        next(new InvalidParametersError('Invalid date format. Please use a valid date'))
        return
    }

    // Check if fromDate is not after toDate
    if (fromDateObj > toDateObj) {
        next(new InvalidParametersError('From date must not be later than To date'))
        return
    }

    // Proceed with populating availabilities
    const populatedUser = await user.populate({
        path: 'availabilities',
        match: {
            date: {
                $gte: fromDateObj,
                $lte: toDateObj
            }
        }
    }) as IUserPopulated

    const availabilities = populatedUser.availabilities

    res.status(200).json(availabilities)
})
