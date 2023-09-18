// Node.js built-in modules

// Third-party libraries
import bcryptjsPkg from 'bcryptjs'
import { customAlphabet } from 'nanoid'
import mongoose, { type Document, type Types, model, type Model } from 'mongoose'

// Own modules
import logger from '../utils/logger.js'
import AvailabilityModel, { type IAvailability } from './Availability.js'
import EventModel, { type IEvent } from './Event.js'
import {
    getSaltRounds,
    getNanoidAlphabet,
    getNanoidLength,
    getUserExpiry
} from '../utils/setupConfig.js'
import {
    UserNotFoundError
} from '../utils/errors.js'

// Destructuring and global variables
const { compare, hash } = bcryptjsPkg
const { Schema } = mongoose

// Config
const saltRounds = getSaltRounds()
const nanoidAlphabet = getNanoidAlphabet()
const nanoidLength = getNanoidLength()
const userExpiry = getUserExpiry()

// Constants
const nanoid = customAlphabet(nanoidAlphabet, nanoidLength)

export interface IUserPopulated extends IUser {
    events: IEvent[]
    availabilities: IAvailability[]
    following: IUser[]
    followers: IUser[]
}

export interface IUser extends Document {
    username: string
    email: string
    password: string
    events: Types.ObjectId[] | IEvent[]
    availabilities: Types.ObjectId[] | IAvailability[]
    following: Types.ObjectId[] | IUser[]
    followers: Types.ObjectId[] | IUser[]
    userCode: string
    confirmed: boolean
    registrationCode?: string
    registrationDate: Date
    expirationDate?: Date

    confirmUser: () => void
    comparePassword: (candidatePassword: string) => Promise<boolean>
    generateNewUserCode: () => Promise<string>
    generateNewRegistrationCode: () => Promise<string>
    follows: (candidateUser: IUser) => Promise<void>
    unFollows: (candidateUser: IUser) => Promise<void>
}

const userSchema = new Schema<IUser>({
    username: { type: String, required: true }, // This is how other users will recognize you. It should reflect your name or nickname. Don't worry, only users in the same events as you can see your name.
    email: { type: String, required: true, unique: true }, // This is how you will log in, no users will be able to see this
    password: { type: String, required: true },
    events: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    availabilities: [{ type: Schema.Types.ObjectId, ref: 'Availability' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    userCode: { type: String, unique: true },
    confirmed: { type: Boolean, default: false },
    registrationCode: { type: String, unique: true }, // Should be kept secret
    registrationDate: { type: Date, default: new Date() }, // Keep track of registration date
    expirationDate: { type: Date }
})

userSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 })

userSchema.methods.confirmUser = function () {
    this.confirmed = true // Update the user's status to confirmed
    delete this.expirationDate // Remove the expiration date to cancel auto-deletion
    delete this.registrationCode
}

// Method for comparing parameter to this users password. Returns true if passwords match
userSchema.methods.comparePassword = async function (this: IUser, candidatePassword: string): Promise<boolean> {
    return await compare(candidatePassword, this.password)
}

// Method for having this user follow parameter user
userSchema.methods.follows = async function (candidateUser: IUser): Promise<void> {
    const session = await mongoose.startSession() // Start a session
    session.startTransaction() // Start a transaction

    try {
        // Update the following array for this user
        await UserModel.findByIdAndUpdate(
            this._id,
            { $addToSet: { following: candidateUser._id } },
            { session } // Add the session option
        ).exec()

        // Update the followers array for the candidate user
        await UserModel.findByIdAndUpdate(
            candidateUser._id,
            { $addToSet: { followers: this._id } },
            { session } // Add the session option
        ).exec()

        await session.commitTransaction() // Commit the transaction
    } catch (error) {
        await session.abortTransaction() // If there's an error, abort the transaction
        throw error // Propagate the error
    } finally {
        session.endSession() // End the session
    }
}

// Method for having this user unfollow parameter user
userSchema.methods.unFollows = async function (candidateUser: IUser): Promise<void> {
    const session = await mongoose.startSession() // Start a session

    session.startTransaction() // Start a transaction

    try {
        // Remove the user from the following array for this user
        await UserModel.findByIdAndUpdate(
            this._id,
            { $pull: { following: candidateUser._id } },
            { session } // Add the session option
        ).exec()

        // Remove this user from the followers array for the candidate user
        await UserModel.findByIdAndUpdate(
            candidateUser._id,
            { $pull: { followers: this._id } },
            { session } // Add the session option
        ).exec()

        await session.commitTransaction() // Commit the transaction
    } catch (error) {
        await session.abortTransaction() // If there's an error, abort the transaction
        throw error // Propagate the error
    } finally {
        session.endSession() // End the session
    }
}

userSchema.methods.generateNewUserCode = async function (this: IUser & { constructor: Model<IUser> }): Promise<string> {
    let userCode: string
    let existingUser: IUser | null

    do {
        userCode = nanoid()
        existingUser = await UserModel.findOne({ userCode }).exec()
    } while (existingUser)

    this.userCode = userCode
    return userCode
}

userSchema.methods.generateNewRegistrationCode = async function (this: IUser & { constructor: Model<IUser> }): Promise<string> {
    let registrationCode: string
    let existingUser: IUser | null

    do {
        registrationCode = nanoid()
        existingUser = await UserModel.findOne({ registrationCode }).exec()
    } while (existingUser || this.registrationCode === registrationCode) // Generate a new and unique registration code

    this.registrationCode = registrationCode
    return registrationCode
}

userSchema.pre(/^find/, function (next) {
    const transformEmailToLowercase = (obj: any) => {
        for (const key in obj) {
            if (typeof obj[key] === 'object') {
                transformEmailToLowercase(obj[key])
            } else if (key === 'email' && typeof obj[key] === 'string') {
                obj[key] = obj[key].toLowerCase()
            }
        }
    }

    const conditions = this as { _conditions?: any }
    if (conditions._conditions) {
        transformEmailToLowercase(conditions._conditions)
    }

    next()
})

userSchema.pre('save', async function (next) {
    if (this.isNew) {
        await this.generateNewUserCode()
        await this.generateNewRegistrationCode()
        this.email = this.email.toString().toLowerCase()
        if (!this.confirmed) {
            this.expirationDate = new Date(Date.now() + userExpiry * 1000) // TTL index, document will expire in process.env.UNCONFIRMED_USER_EXPIRY seconds if not confirmed
        }
    }

    if (this.confirmed) {
        delete this.expirationDate
        delete this.registrationCode
    }

    if (this.isModified('email')) {
        this.email = this.email.toString().toLowerCase()
    }

    // Password hashing middleware
    if (this.isModified('password')) {
        try {
            this.password = await hash(this.password, saltRounds) // Using a custom salt for each user
            next(); return
        } catch (error) {
            if (error instanceof Error) {
                next(error)
            } else {
                // Log or handle the error as it's not of type Error
                logger.error('An unexpected error occurred:', error)
                next() // You can call next without an argument, as the error is optional
            }
        }
    }
    logger.silly('User saved')
})

const deleteLogic = async function (this: IUser & { constructor: Model<IUser> }, next: mongoose.CallbackWithoutResultAndOptionalError): Promise<void> {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        // Remove user from followers following array
        for (const followerId of this.followers) {
            // Get the user
            const user = await UserModel.findById(followerId).exec()

            if (!user) {
                throw new UserNotFoundError('User not found')
            }

            // Remove this user from the followers's following array
            await UserModel.findByIdAndUpdate(followerId, {
                $pull: { following: this._id }
            }, { session }).exec() // Use the session
        }

        // Remove user from events
        for (const eventId of this.events) {
            await EventModel.findByIdAndUpdate(eventId, {
                $pull: { participants: this._id }
            }, { session }).exec() // Use the session
        }

        // Remove the users availabilities
        for (const availabilityId of this.availabilities) {
            await AvailabilityModel.deleteMany({ _id: availabilityId }, { session }).exec() // Use the session
        }

        logger.silly('User removed')
        await session.commitTransaction()
        next()
    } catch (error: any) {
        await session.abortTransaction() // Abort the transaction
        next(error)
    } finally {
        session.endSession() // Close the session
    }
}

userSchema.pre('deleteOne', { document: true, query: false }, deleteLogic)
userSchema.pre('findOneAndDelete', { document: true, query: false }, deleteLogic)
userSchema.pre('deleteMany', { document: true, query: false }, deleteLogic)

const UserModel = model<IUser>('User', userSchema)

export default UserModel
