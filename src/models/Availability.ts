import mongoose, { type Document, model } from 'mongoose'
const { Schema } = mongoose

export interface IAvailability extends Document {
    description?: string
    startDate: Date
    endDate: Date
    status: 'Free' | 'Busy' | 'Maybe'
    preference?: 1 | 2 | 3
}
// TODO: If an availability is not set, meaning you are undecided on that date, it will be assumed to be free. Before the date for the event is locked, the user will be warned that not all users are decided, if thats the case.
const availabilitySchema = new Schema<IAvailability>({
    description: { type: String }, // This is public for anyone in the same event as you if the date is within the events date-range
    startDate: { type: Date, required: true, validate: { validator: function (this: IAvailability, value: Date): boolean { return value < this.endDate }, message: 'Start date must be before end date' } },
    endDate: { type: Date, required: true, validate: { validator: function (this: IAvailability, value: Date): boolean { return value > this.startDate }, message: 'End date must be after start date' } },
    status: { type: String, enum: ['Free', 'Busy', 'Maybe'], required: true },
    preference: { type: Number, min: 1, max: 3, default: 2 } // 1-3 scale for preference. 1: Free, but prefer not to. 2: Default/Normal preference. 3: Strongly prefer. Strongly preferring every availability will have the same effect as normal preference, so be selective.
})

const AvailabilityModel = model<IAvailability>('Availability', availabilitySchema)

export default AvailabilityModel
