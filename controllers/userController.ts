// Node.js built-in modules

// Third-party libraries
import passport from 'passport'
import validator from 'validator'
import { type Request, type Response, type NextFunction } from 'express'
import mongoose, { type Types } from 'mongoose'

// Own modules
import {
    InvalidEmailError,
    InvalidCredentialsError,
    UserNotFoundError,
    EmailAlreadyExistsError,
    MissingFieldsError,
    InvalidConfirmationCodeError,
    UserAlreadyConfirmedError
} from '../utils/errors.js'
import {
    sendConfirmationEmail,
    sendPasswordResetEmail
} from '../utils/mailer.js'
import UserModel, { type IUserPopulated, type IUser } from '../models/User.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'
import logger from '../utils/logger.js'
import {
    getSessionExpiry,
    getSessionPersistentExpiry,
    getNextJsPort,
    getFrontendDomain
} from '../utils/setupConfig.js'

// Destructuring and global variables

// Config
const sessionExpiry = getSessionExpiry()
const sessionPersistentExpiry = getSessionPersistentExpiry()
const nextJsPort = getNextJsPort()
const frontendDomain = getFrontendDomain()

// Helper functions
function generateConfirmationLink (registrationCode: string): string {
    let confirmationLink: string
    // Generate confirmation link
    if (process.env.NODE_ENV === 'production') {
        confirmationLink = `http://${frontendDomain}/confirm?userCode=${registrationCode}`
    } else {
        confirmationLink = `http://${frontendDomain}:${nextJsPort}/confirm?userCode=${registrationCode}`
    }

    logger.silly(confirmationLink)

    return confirmationLink
}

function generatePasswordResetLink (passwordResetCode: string): string {
    let passwordResetLink: string
    // Generate confirmation link
    if (process.env.NODE_ENV === 'production') {
        passwordResetLink = `http://${frontendDomain}/reset-password?passwordResetCode=${passwordResetCode}`
    } else {
        passwordResetLink = `http://${frontendDomain}:${nextJsPort}/reset-password?passwordResetCode=${passwordResetCode}`
    }

    logger.silly(passwordResetLink)

    return passwordResetLink
}

function ensureFieldsPresent (body: Record<string, string>, requiredFields: string[], next: NextFunction): void {
    const missingFields = requiredFields.filter(reqField => !body[reqField])
    if (missingFields.length > 0) {
        missingFields.sort((a, b) => a.localeCompare(b))
        throw new MissingFieldsError(`Missing ${missingFields.join(', ')}`)
    }
}

export const getCurrentUser =
(req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as IUser

    const userToSendToFrontend = {
        username: user.username,
        email: user.email,
        events: user.events,
        availabilities: user.availabilities,
        following: user.following,
        followers: user.followers,
        userCode: user.userCode,
        confirmed: user.confirmed,
        registrationDate: user.registrationDate,
        expirationDate: user.expirationDate
    }
    res.send(userToSendToFrontend)
}

export const registerUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { username, email, password, confirmPassword } = req.body

    const requiredFields = ['username', 'email', 'password', 'confirmPassword']
    ensureFieldsPresent(req.body, requiredFields, next)

    if (!validator.isEmail(email)) {
        next(new InvalidEmailError('Invalid email format')); return
    }

    if (password !== confirmPassword) {
        next(new InvalidCredentialsError('Password and Confirm Password does not match')); return
    }

    if (String(password).length < 4) {
        next(new InvalidCredentialsError('Password must be at least 5 characters')); return
    }

    const existingUser = await UserModel.findOne({ email }).exec()

    if (existingUser) { // TODO: It should not reveal whether the email exists in the database. Log the user in instead
        next(new EmailAlreadyExistsError('Email already exists, please sign in instead')); return
    }

    // User doesn't exist, create a new user
    const newUser = new UserModel({
        username,
        email,
        password
    })
    const savedUser = await newUser.save()

    const registrationCode = await savedUser.generateNewRegistrationCode()
    const confirmationLink = generateConfirmationLink(registrationCode)
    await sendConfirmationEmail(email, confirmationLink)

    res.status(201).json({
        message: 'Registration successful! Please check your email to confirm your account within 24 hours or your account will be deleted.'
    })
})

export const requestPasswordResetEmail = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email } = req.body

    const user = await UserModel.findOne({ email }).exec()

    if (user) {
        const passwordResetCode = await user.generateNewPasswordResetCode()
        const confirmationLink = generatePasswordResetLink(passwordResetCode)
        await sendPasswordResetEmail(email, confirmationLink)
    }

    res.status(200).json({
        message: 'If the email address exists, a password reset email has been sent.'
    })
})

export const confirmUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Extract the confirmation code from the query parameters
    const { userCode } = req.params

    if (!userCode) {
        next(new MissingFieldsError('Confirmation code missing')); return
    }

    // Find the user with the corresponding confirmation code
    const user = await UserModel.findOne({ userCode }).exec()

    if (!user) {
        next(new InvalidConfirmationCodeError('Invalid confirmation code')); return
    }

    if (user.confirmed) {
        next(new UserAlreadyConfirmedError('User has already been confirmed')); return
    }

    // Update the user's status to 'confirmed'
    user.confirmUser()
    await user.save()

    // Redirect the user or send a success message
    res.status(200).json({
        message: 'Confirmation successful! Your account has been activated.'
    })
})

export const loginUserLocal = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requiredFieldsForLogin = ['email', 'password']
    ensureFieldsPresent(req.body, requiredFieldsForLogin, next)

    passport.authenticate('local', (err: Error, user: IUser, info: { message: string }) => {
        if (err) {
            next(err); return
        }

        if (!user) {
            res.status(401).json({ auth: false, error: info.message }); return
        }

        req.login(user, err => {
            if (err) {
                next(err); return
            }

            if (req.body.stayLoggedIn === 'true') {
                req.session.cookie.maxAge = sessionPersistentExpiry * 1000
            } else {
                req.session.cookie.maxAge = sessionExpiry * 1000
            }

            res.status(200).json({ auth: true })
        })
    })(req, res, next)
})

export const logoutUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    req.logout(function (err) {
        if (err) { next(err); return }

        req.session.destroy(function (sessionErr) {
            if (sessionErr) {
                next(sessionErr); return
            }
            res.status(200).json({ message: 'Logged out successfully' })
        })
    })
})

export const getEvents = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const populatedUser = await user.populate('events')
    res.status(200).json(populatedUser.events)
})

export const newCode = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    // Generate a new userCode
    const userCode = await user.generateNewUserCode()
    await user.save()
    res.status(200).json({ userCode })
})

export const followUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const candidateUserId = req.params.userId
    const candidateUser = await UserModel.findById(candidateUserId).exec()
    const user = req.user as IUser

    if (!candidateUser) {
        next(new UserNotFoundError('The user to be followed could not be found')); return
    }

    if (candidateUser.id === user.id) {
        next(new UserNotFoundError('User cannot follow themselves')); return
    }

    const followingArray = user.following as Array<{ _id: Types.ObjectId }>
    if (followingArray.find(u => u._id.toString() === candidateUser._id.toString())) {
        res.status(200).json({ message: 'User is already followed' }); return
    }

    await user.follows(candidateUser)

    res.status(200).json(candidateUser)
})

export const unfollowUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const candidateUserId = req.params.userId
    const user = req.user as IUser

    const candidateUser = await UserModel.findById(candidateUserId).exec()
    if (!candidateUser) {
        next(new UserNotFoundError('The user to be un-followed could not be found')); return
    }

    if (candidateUserId === user.id) {
        next(new UserNotFoundError('User cannot un-follow themselves')); return
    }

    const followingArray = user.following as Array<{ _id: Types.ObjectId }>
    if (!followingArray.find(u => u._id.toString() === candidateUser._id.toString())) {
        res.status(400).json({ error: 'User is not followed' }); return
    }

    await user.unFollows(candidateUser)

    res.status(200).json(candidateUser)
})

export const getFollowers = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const populatedUser = await user.populate('followers') as IUserPopulated
    const followerNames = populatedUser.followers.map(follower => follower.username)

    res.status(200).json(followerNames)
})

export const getFollowing = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const populatedUser = await user.populate('following') as IUserPopulated
    const followingNames = populatedUser.following.map(following => following.username)

    res.status(200).json(followingNames)
})

export const getCommonEvents = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const candidateUserId = req.params.userId

    if (!mongoose.Types.ObjectId.isValid(candidateUserId)) {
        res.status(400).json({ error: 'Invalid user ID format' }); return
    }

    const candidateUser = await UserModel.findById(candidateUserId).exec()

    if (!candidateUser) {
        next(new UserNotFoundError('The user to be found events in common with could not be found')); return
    }

    const userEvents = user.events as Types.ObjectId[]
    const candidateUserEvents = candidateUser.events as Types.ObjectId[]

    const commonEvents = userEvents.filter(userEvent => candidateUserEvents.includes(userEvent))

    res.status(200).json(commonEvents)
})

export const updatePassword = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser

    const {
        newPassword,
        confirmNewPassword,
        currentPassword
    } = req.body

    const requiredFields = ['newPassword', 'confirmNewPassword', 'currentPassword']
    ensureFieldsPresent(req.body, requiredFields, next)

    if (newPassword !== confirmNewPassword) {
        next(new InvalidCredentialsError('newPassword and confirmNewPassword does not match')); return
    }

    const passwordsMatch = await user.comparePassword(currentPassword)
    if (passwordsMatch) {
        user.password = newPassword
    } else {
        next(new InvalidCredentialsError('currentPassword does not match with user password')); return
    }

    await user.save()

    res.status(200).json(user)
})

export const resetPassword = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
        newPassword,
        confirmNewPassword
    } = req.body
    const { passwordResetCode } = req.params

    const requiredFields = ['newPassword', 'confirmNewPassword']
    ensureFieldsPresent(req.body, requiredFields, next)

    if (newPassword !== confirmNewPassword) {
        next(new InvalidCredentialsError('newPassword and confirmNewPassword does not match')); return
    }

    const user = await UserModel.findOne({ passwordResetCode })

    if (!user) {
        res.status(404).send(); return
    }

    user.password = newPassword

    await user.save()

    res.status(201).json(user)
})

export const updateUsername = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser

    const newUsername = req.body.newUsername

    const requiredFields = ['newUsername']
    ensureFieldsPresent(req.body, requiredFields, next)

    user.username = newUsername

    await user.save()

    res.status(200).json(user)
})

export const deleteUser = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser

    UserModel.findOneAndDelete(user._id)

    await user.save()

    res.status(200).json(user)
})
