// Own modules
import Availability, { type IAvailability } from '../models/Availability.js'
import User, { IUser } from '../models/User.js'
import errors from '../utils/errors.js'

// Destructuring and global variables
const {
    MissingFieldsError,
    UserNotFoundError
} = errors

export const newOrUpdateAvailability = async (req, res, next) => {
    const {
        description,
        status,
        preference
    } = req.body

    const date = req.params.date

    // Checks if description, date, status and preference are not falsy (e.g., undefined, null, empty string)
    if (!date) {
        return next(new MissingFieldsError('Date must be specified'))
    }

    // Check if user already has a availability set for this date
    const userId = req.user.id
    const populatedUser = await User.findById(userId).populate('availabilities').exec()

    if (!populatedUser) {
        return next(new UserNotFoundError('The user could not be found'))
    }

    const existingAvailability = ((populatedUser.availabilities as unknown) as IAvailability[]).find(availability => availability.date === date)

    if (existingAvailability) { // Check if availability is truthy
    // Availability exists, update the provided fields instead
        if (description) { existingAvailability.description = description }
        if (status) { existingAvailability.status = status }
        if (preference) { existingAvailability.preference = preference }
        const savedAvailability = await existingAvailability.save()
        return res.status(201).json(savedAvailability)
    } // Availability is new, all fields are therefore required

    // Check if description, status and preference are not falsy (e.g., undefined, null, empty string)
    if (!description || !status || !preference) {
        return next(new MissingFieldsError('Missing required fields'))
    }

    const newAvailability = new Availability({
        description,
        date,
        status,
        preference
    })

    const savedAvailability = await newAvailability.save()

    populatedUser.availabilities.push(savedAvailability._id)

    return res.status(201).json(savedAvailability)
}
