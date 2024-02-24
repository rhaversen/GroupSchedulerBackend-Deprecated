// Node.js built-in modules

// Third-party libraries
import mongoose, { type Document, model, type Model, type Types } from 'mongoose'
import { customAlphabet } from 'nanoid'

// Own modules
import UserModel, { type IUser } from './User.js'
import logger from '../utils/logger.js'
import config from '../utils/setupConfig.js'
import { UserNotFoundError } from '../utils/errors.js'

// Destructuring and global variables
const { Schema } = mongoose

// Config
const {
    nanoidAlphabet,
    nanoidLength
} = config

// Constants
const nanoid = customAlphabet(nanoidAlphabet, nanoidLength)

export interface IEventPopulated extends IEvent {
    participants: IUser[]
    admins: IUser[]
    owner: IUser
}

export interface IEvent extends Document {
    eventName: string
    eventDescription?: string
    startDate: Date
    endDate: Date
    participants: Types.ObjectId[] | IUser[]
    admins: Types.ObjectId[] | IUser[]
    owner: Types.ObjectId | IUser
    eventCode: string
    adminLocked: boolean

    generateNewEventCode: () => Promise<void>
    isAdmin: (this: IEvent, userId: string) => boolean
    isOwner: (this: IEvent, userId: string) => boolean
}

const eventSchema = new Schema<IEvent>({
    eventName: { type: String, required: true },
    eventDescription: { type: String },
    startDate: {
        type: Date,
        required: true,
        validate: {
            validator: function (this: IEvent, value: Date) {
                return value < this.endDate
            },
            message: 'Start date must be before end date'
        }
    },
    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function (this: IEvent, value: Date) {
                return value > this.startDate
            },
            message: 'End date must be after start date'
        }
    },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    eventCode: { type: String, unique: true },
    adminLocked: { type: Boolean, default: true }
})
// TODO: Events should have general availabilities set by admins. Event availability takes precedence over users availabilities, which means an admin can add when a
// summerhouse is available (free), when tickets are cheapest (preferred), when transportation isn't available (busy) and so on. users might prefer one week, but if the
// event prefers another because it is cheaper, more convenient or whatever, most users would agree they prefer that too. Event availabilities are deleted with the event.

// TODO: Users should be able to set whether they would prefer sooner dates, later dates or no preference. If they just want to meet, soonest would be most attractive. If
// they want to travel, later dates would be cheaper.
eventSchema.methods.generateNewEventCode = async function (this: IEvent & {
    constructor: Model<IEvent>
}): Promise<void> {
    let eventCode: string
    let existingEvent: IEvent | null

    do {
        eventCode = nanoid()
        existingEvent = await EventModel.findOne({ eventCode }).exec()
    } while (existingEvent !== null && existingEvent !== undefined)

    this.eventCode = eventCode
    await this.save()
}

eventSchema.methods.isAdmin = function (this: IEvent, userId: string): boolean {
    return this.admins.some(admin => admin._id === userId)
}

eventSchema.methods.isOwner = function (this: IEvent, userId: string): boolean {
    return this.owner.id === userId
}

eventSchema.pre('save', async function (this: IEvent & { constructor: Model<IEvent> }, next): Promise<void> {
    if (this.isNew) {
        let eventCode: string
        let existingEvent: IEvent | null

        do {
            eventCode = nanoid()
            existingEvent = await EventModel.findOne({ eventCode }).exec()
        } while (existingEvent !== null && existingEvent !== undefined)

        this.eventCode = eventCode
    }

    try {
        if (this.participants.length === 0) {
            await this.deleteOne()
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            next(error)
        } else {
            // Log or handle the error as it's not of type Error
            logger.error('An unexpected error occurred:', error)
            next() // You can call next without an argument, as the error is optional
        }
    }

    logger.silly('Event saved')
    next()
})

// Remove event from users
const deleteLogic = async function (this: IEvent & {
    constructor: Model<IEvent>
}, next: mongoose.CallbackWithoutResultAndOptionalError): Promise<void> {
    try {
        // Go through all participants
        for (const participantId of this.participants) {
            // Get the user
            const user = await UserModel.findById(participantId).exec()

            if (user === null || user === undefined) {
                next(new UserNotFoundError('User not found'))
                return
            }

            // Remove the event from the user's events array
            await EventModel.deleteOne({ _id: this._id }).exec()

            logger.silly('Event removed')
        }

        next()
    } catch (error: unknown) {
        if (error instanceof Error) {
            next(error)
        } else {
            // Log or handle the error as it's not of type Error
            logger.error('An unexpected error occurred:', error)
            next() // You can call next without an argument, as the error is optional
        }
    }
}

eventSchema.pre('deleteOne', { document: true, query: false }, deleteLogic)
eventSchema.pre('deleteMany', { document: true, query: false }, deleteLogic)

// Compile the schema into a model
const EventModel = model<IEvent>('Event', eventSchema)

export default EventModel
