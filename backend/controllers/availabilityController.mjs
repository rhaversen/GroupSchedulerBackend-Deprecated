import Availability from "../models/Availability.mjs";
import User from "../models/User.mjs";

export const newOrUpdateAvailability = async (req, res, next) => {
    const {
        description,
        date,
        status,
        preference
    } = req.body;

    // Checks if description, date, status and preference are not falsy (e.g., undefined, null, empty string)
    if (!date) {
        return next(new MissingFieldsError('Date must be specified'));
    }

    const userId = req.user.id;
    const user = await User.findById(userId).exec();

    // Check if user already has a availability set for this date
    const existingAvailability = await user.availabilities.findOne({date}).exec();
    if(existingAvailability){  // Check if availability is truthy
        // Availability exists, update the provided fields instead
        if(description){existingAvailability.description = description}
        if(status){existingAvailability.status = status}
        if(preference){existingAvailability.preference = preference}
        const savedAvailability = await existingAvailability.save();
        return res.status(201).json(savedAvailability);
    } // Availability is new, all fields are therefore required

    // Check if description, status and preference are not falsy (e.g., undefined, null, empty string)
    if ( !description || !status || !preference ) {
        return next(new MissingFieldsError('Missing required fields'));
    }

    const newAvailability = new Availability({
        description,
        date,
        status,
        preference
    })

    const savedAvailability = await newAvailability.save();

    user.availabilities.push(savedAvailability._id)

    return res.status(201).json(savedAvailability);
}