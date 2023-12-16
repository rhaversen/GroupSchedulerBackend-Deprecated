// Node.js built-in modules

// Third-party libraries
import { type NextFunction, type Request, type Response } from 'express'

// Own modules
import AvailabilityModel, { type IAvailability } from '../models/Availability.js'
import UserModel, { type IUser, type IUserPopulated } from '../models/User.js'
import { InvalidParametersError, MissingFieldsError, UserNotOwnerError } from '../utils/errors.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'

// Destructuring and global variables

export const newAvailability = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
        status,
        preference
    } = req.body
    const { date: dateString } = req.params // Assuming date is a parameter in the URL

    // Checks if dateString is not falsy
    if (!dateString) {
        next(new MissingFieldsError('Missing required field "date"'))
        return
    }

    // Validate the date string
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
        next(new InvalidParametersError('Invalid date format'))
        return
    }

    // Check if user already has an availability set for this date
    const user = req.user as IUser
    const populatedUser = await user.populate({
        path: 'availabilities',
        match: { date: { $eq: date } }
    }) as IUserPopulated

    const existingAvailability = populatedUser.availabilities.find(av => new Date(av.date).toDateString() === date.toDateString())

    if (existingAvailability) {
        next(new InvalidParametersError('User already has an availability for this date'))
        return
    }

    const newAvailability = new AvailabilityModel({
        date,
        status,
        preference
    }) as IAvailability

    const savedAvailability = await newAvailability.save()

    // Add availability to the user
    await UserModel.findByIdAndUpdate(user._id, { $addToSet: { availabilities: savedAvailability._id } }).exec()

    res.status(201).json(savedAvailability)
})

export const updateAvailability = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
        date,
        status,
        preference
    } = req.body
    const availabilityId = req.params.id

    // Checks if date and availabilityId are not falsy
    if (!date || !availabilityId) {
        next(new MissingFieldsError('Missing required field(s): "date" or "availabilityId"'))
        return
    }

    // Validate the date string
    const dateObj = new Date(date)
    if (Number.isNaN(dateObj.getTime())) {
        next(new InvalidParametersError('Invalid date format'))
        return
    }

    const existingAvailability = await AvailabilityModel.findById(availabilityId).exec() as IAvailability | null
    const user = req.user as IUser

    // Check if the availability exists
    if (!existingAvailability) {
        next(new InvalidParametersError('Availability not found in the database'))
        return
    }

    // Check if the availability is owned by the user
    const populatedUser = await user.populate('availabilities') as IUserPopulated
    const userIsOwner = populatedUser.availabilities.includes(existingAvailability)
    if (!userIsOwner) {
        next(new UserNotOwnerError('User not owner of availability'))
        return
    }

    // Update only the fields provided
    if (date) existingAvailability.date = dateObj
    if (status) existingAvailability.status = status
    if (preference) existingAvailability.preference = preference

    const savedAvailability = await existingAvailability.save()

    res.status(200).json(savedAvailability)
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

export const deleteAvailability = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const { availabilityId } = req.params

    if (!availabilityId) {
        next(new InvalidParametersError('availabilityId is required'))
        return
    }

    // Check if the availability is not falsy
    const availabilityToDelete = await AvailabilityModel.findById(availabilityId).exec()

    if (!availabilityToDelete) {
        next(new InvalidParametersError('Availability not found in the database'))
        return
    }

    // Check if the availability is in the user's array of availabilities
    const populatedUser = await user.populate('availabilities') as IUserPopulated
    const userIsOwner = populatedUser.availabilities.some(av => av.id === availabilityToDelete.id)

    if (!userIsOwner) {
        next(new UserNotOwnerError('User not owner of availability'))
        return
    }

    // Perform the deletion
    await AvailabilityModel.deleteOne(availabilityToDelete.id)

    // Remove the reference from the user's availabilities array
    await UserModel.findByIdAndUpdate(user._id, { $pull: { availabilities: availabilityToDelete.id } })

    res.status(200).json({ message: 'Availability deleted successfully.' })
})
