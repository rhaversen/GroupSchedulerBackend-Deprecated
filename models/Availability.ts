import mongoose, { type Document, Types, model, PopulatedDoc } from 'mongoose'
const { Schema } = mongoose

export interface IAvailability extends Document {
    description?: string
    date: Date
    status: 'Free' | 'Busy' | 'Maybe'
    preference: number
}

const availabilitySchema = new Schema<IAvailability>({
    description: { type: String }, // This is public for anyone in the same event as you if the date is within the events date-range
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
    status: { type: String, enum: ['Free', 'Busy', 'Maybe'], required: true },
    preference: { type: Number, min: 1, max: 3, default: 2 } // 1-3 scale for preference. 1: Free, but prefer not to. 2: Default/Normal preference. 3: Strongly prefer. Strongly preferring every availability will have the same effect as normal preference, so be selective.
})

export default model('Availability', availabilitySchema)
