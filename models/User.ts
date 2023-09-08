// Node.js built-in modules
import config from 'config'

// Third-party libraries
import dotenv from 'dotenv'
import bcryptjsPkg from 'bcryptjs'
import { customAlphabet } from 'nanoid'
import mongoose, { type Document, type Types, model, type Model } from 'mongoose'

// Own modules
import errors from '../utils/errors.js'
import logger from '../utils/logger.js'
import { type IAvailability } from './Availability.js'
import EventModel, { type IEvent } from './Event.js'

// Setup
dotenv.config()

// Destructuring and global variables
const { compare, hash } = bcryptjsPkg
const { Schema } = mongoose
const {
    UserNotFoundError
} = errors

// Config
const saltRounds = Number(config.get('bcrypt.saltRounds'))
const nanoidAlphabet = String(config.get('nanoid.alphabet'))
const nanoidLength = Number(config.get('nanoid.length'))
const userExpiry = Number(config.get('userSettings.unconfirmedUserExpiry'))

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

    confirmUser: () => Promise<void>
    comparePassword: (candidatePassword: string) => Promise<boolean>
    generateNewUserCode: () => Promise<string>
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
    expirationDate: { type: Date, default: new Date(Date.now() + userExpiry * 1000) } // TTL index, document will expire in process.env.UNCONFIRMED_USER_EXPIRY seconds if not confirmed
})

userSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 })

userSchema.methods.confirmUser = async function () {
    this.confirmed = true // Update the user's status to confirmed
    this.expirationDate = undefined // Remove the expiration date to cancel auto-deletion
}

// Method for comparing parameter to this users password. Returns true if passwords match
userSchema.methods.comparePassword = async function (this: IUser, candidatePassword: string): Promise<boolean> {
    return await compare(candidatePassword, this.password)
}

userSchema.methods.generateNewUserCode = async function (this: IUser & { constructor: Model<IUser> }): Promise<string> {
    let userCode: string
    let existingUser: IUser | null

    do {
        userCode = nanoid()
        existingUser = await this.constructor.findOne({ userCode }).exec()
    } while (existingUser)

    this.userCode = userCode
    return userCode
}

userSchema.pre(/^find/, function(next) {

    const transformEmailToLowercase = (obj: any) => {
        for (const key in obj) {
            if (typeof obj[key] === 'object') {
                transformEmailToLowercase(obj[key]);
            } else if (key === 'email' && typeof obj[key] === 'string') {
                obj[key] = obj[key].toLowerCase();
            }
        }
    };

    const conditions = this as { _conditions?: any };
    if (conditions._conditions) {
        transformEmailToLowercase(conditions._conditions);
    }

    next();
});



userSchema.pre('save', async function (next) {
    if (this.isNew) {
        await this.generateNewUserCode()
        this.email = this.email.toString().toLowerCase();
    }

    if (this.isModified('email')) {
        this.email = this.email.toString().toLowerCase();
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
    logger.info('User saved')
})

// Remove event from users
const deleteLogic = async function (this: IUser & { constructor: Model<IUser> }, next: mongoose.CallbackWithoutResultAndOptionalError): Promise<void> {
    try {
        // Remove user from followers following array
        for (const followerId of this.followers) {
            // Get the user
            const user = await this.constructor.findById(followerId).exec()

            if (!user) {
                next(new UserNotFoundError('User not found')); return
            }

            // Remove this user from the followers's following array
            await UserModel.findByIdAndUpdate(followerId, {
                $pull: { following: this._id }
            }).exec()

            // Save the user
            await user.save()
            logger.info('User removed')
        }

        // Remove user from events
        for (const eventId of this.events) {
            await EventModel.findByIdAndUpdate(eventId, {
                $pull: { participants: this._id }
            }).exec()

            logger.info('User removed')
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

userSchema.pre('deleteOne', { document: true, query: false }, deleteLogic)
userSchema.pre('findOneAndDelete', { document: true, query: false }, deleteLogic)
userSchema.pre('deleteMany', { document: true, query: false }, deleteLogic)

const UserModel = model<IUser>('User', userSchema)

export default UserModel
