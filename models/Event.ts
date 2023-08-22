// Node.js built-in modules
import config from 'config'

// Third-party libraries
import mongoose, { type Document, type Types, model } from 'mongoose'
import { customAlphabet } from 'nanoid'

// Own modules
import User from './User.js'
import logger from '../utils/logger.js'
import errors from '../utils/errors.js'

// Destructuring and global variables
const { Schema } = mongoose
const {
    UserNotFoundError
} = errors

// Config
const nanoidAlphabet = String(config.get('nanoid.alphabet'))
const nanoidLength = Number(config.get('nanoid.length'))

// Constants
const nanoid = customAlphabet(nanoidAlphabet, nanoidLength)

export interface IEvent extends Document {
    eventName: string
    eventDescription?: string
    startDate: Date
    endDate: Date
    participants: Types.ObjectId[]
    admins: Types.ObjectId[]
    eventCode: string

    generateNewEventCode: () => Promise<void>
    isAdmin: (userId: Types.ObjectId) => boolean
    isLocked: () => boolean
}

const eventSchema = new Schema<IEvent>({
    eventName: { type: String, required: true },
    eventDescription: { type: String },
    startDate: { type: Date, required: true, validate: { validator: function (value) { return value < this.endDate }, message: 'Start date must be before end date' } },
    endDate: { type: Date, required: true, validate: { validator: function (value) { return value > this.startDate }, message: 'End date must be after start date' } },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }], // If admins is empty, the event is considered to be editable by all participants
    eventCode: { type: String, unique: true, required: true }
})
// TODO: Events should have general availabilities set by admins. Event availability takes precedence over users availabilities, which means an admin can add when a
// summerhouse is available (free), when tickets are cheapest (preferred), when transportation isn't available (busy) and so on. users might prefer one week, but if the
// event prefers another because it is cheaper, more convenient or whatever, most users would agree they prefer that too. Event availabilities are deleted with the event.

// TODO: Users should be able to set whether they would prefer sooner dates, later dates or no preference. If they just want to meet, soonest would be most attractive. If
// they want to travel, later dates would be cheaper.
eventSchema.methods.generateNewEventCode = async function () {
    let eventCode
    let existingEvent

    do {
        eventCode = nanoid()
        existingEvent = await this.constructor.findOne({ eventCode })
    } while (existingEvent)

    this.eventCode = eventCode
    await this.save()
}

eventSchema.methods.isAdmin = function (userId) {
    return this.admins.some(admin => admin.equals(userId))
}

eventSchema.methods.isLocked = function () {
    return this.admins.length !== 0
}

eventSchema.pre('save', async function (next) {
    if (this.isNew) {
        let eventCode
        let existingEvent

        do {
            eventCode = nanoid()
            existingEvent = await this.constructor.findOne({ eventCode })
        } while (existingEvent)

        this.eventCode = eventCode
    }

    // Delete event if empty
    if (this.$isEmpty('participants')) {
        try {
            await this.remove()
        } catch (err) {
            next(err)
            return
        }
    }

    logger.info('Event saved')
    next()
})

// Remove event from users
eventSchema.pre('remove', async function (next) {
    try {
    // Go through all participants
        for (const participantId of this.participants) {
            // Get the user
            const user = await User.findById(participantId).exec()

            if (!user) {
                throw new UserNotFoundError('User not found')
            }

            // Remove the event from the user's events array
            user.events = user.events.filter(eventId => eventId.toString() !== this._id.toString())

            // Save the user
            await user.save()
            logger.info('Event removed')
        }

        next()
    } catch (error) {
        next(error)
    }
})

export default model('Event', eventSchema)
