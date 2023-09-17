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
import { NextFunction } from 'express'
import {
    UserNotFoundError
}from '../utils/errors.js'

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
    registrationDate: Date
    expirationDate?: Date

    confirmUser: () => void
    comparePassword: (candidatePassword: string) => Promise<boolean>
    generateNewUserCode: () => Promise<string>
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
    registrationDate: { type: Date, default: new Date() }, // Keep track of registration date
    expirationDate: { type: Date }
})

userSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 })

userSchema.methods.confirmUser = function () {
    this.confirmed = true // Update the user's status to confirmed
    delete this.expirationDate // Remove the expiration date to cancel auto-deletion
}

// Method for comparing parameter to this users password. Returns true if passwords match
userSchema.methods.comparePassword = async function (this: IUser, candidatePassword: string): Promise<boolean> {
    return await compare(candidatePassword, this.password)
}

// Method for having this user follow parameter user
userSchema.methods.follows = async function (candidateUser: IUser): Promise<void> {
    await Promise.all([
        UserModel.findByIdAndUpdate(this._id, { $push: { following: candidateUser._id } }).exec(),
        UserModel.findByIdAndUpdate(candidateUser._id, { $push: { followers: this._id } }).exec()
    ])
}

// Method for having this user unfollow parameter user
userSchema.methods.unFollows = async function (candidateUser: IUser): Promise<void> {
    await Promise.all([
        UserModel.findByIdAndUpdate(this._id, { $pull: { following: candidateUser._id } }).exec(),
        UserModel.findByIdAndUpdate(candidateUser._id, { $pull: { followers: this._id } }).exec()
    ])
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
        this.email = this.email.toString().toLowerCase()
        if (!this.confirmed) {
            this.expirationDate = new Date(Date.now() + userExpiry * 1000) // TTL index, document will expire in process.env.UNCONFIRMED_USER_EXPIRY seconds if not confirmed
        }
    }

    if (this.confirmed) {
        delete this.expirationDate
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

// Remove event from users
const deleteLogic = async function (this: IUser & { constructor: Model<IUser> }, next: mongoose.CallbackWithoutResultAndOptionalError): Promise<void> {
    try {
        // Remove user from followers following array
        for (const followerId of this.followers) {
            // Get the user
            const user = await UserModel.findById(followerId).exec()

            if (!user) {
                next(new UserNotFoundError('User not found')); return
            }

            // Remove this user from the followers's following array
            await UserModel.findByIdAndUpdate(followerId, {
                $pull: { following: this._id }
            }).exec()
        }

        // Remove user from events
        for (const eventId of this.events) {
            await EventModel.findByIdAndUpdate(eventId, {
                $pull: { participants: this._id }
            }).exec()
        }

        // Remove the users availabilities
        for (const availabilityId of this.availabilities) {
            await AvailabilityModel.deleteMany({ id: this.availabilities })
        }

        logger.silly('User removed')
        next()
    } catch (error: any) {
        next(error)
    }
}

userSchema.pre('deleteOne', { document: true, query: false }, deleteLogic)
userSchema.pre('findOneAndDelete', { document: true, query: false }, deleteLogic)
userSchema.pre('deleteMany', { document: true, query: false }, deleteLogic)

const UserModel = model<IUser>('User', userSchema)

export default UserModel
