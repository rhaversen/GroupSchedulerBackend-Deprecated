// Node.js built-in modules
import config from 'config'

// Third-party libraries
import passport from 'passport'
import validator from 'validator'
import dotenv from 'dotenv'
import { type Request, type Response, type NextFunction } from 'express'
import mongoose, { type Types } from 'mongoose'

// Own modules
import errors from '../utils/errors.js'
import { sendConfirmationEmail } from '../utils/mailer.js'
import UserModel, { IUserPopulated, type IUser } from '../models/User.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'
import logger from '../utils/logger.js'

// Destructuring and global variables
const {
    InvalidEmailError,
    InvalidCredentialsError,
    UserNotFoundError,
    EmailAlreadyExistsError,
    MissingFieldsError,
    InvalidConfirmationCodeError,
    UserAlreadyConfirmedError,
    UserNotConfirmedError
} = errors

// Config
const sessionExpiry = Number(config.get('session.expiry'))
const sessionPersistentExpiry = Number(config.get('session.persistentExpiry'))
const nextJsPort = config.get('ports.nextJs')
const frontendDomain = config.get('frontend.domain')

// Setup
dotenv.config()

// Helper function
function generateConfirmationLink(userCode: string): string{
    let confirmationLink: string
    // Generate confirmation link
    if (process.env.NODE_ENV === 'production') {
        confirmationLink = `http://${frontendDomain}/confirm?userCode=${userCode}`
    } else {
        confirmationLink = `http://${frontendDomain}:${nextJsPort}/confirm?userCode=${userCode}`
    }

    logger.info(confirmationLink)

    return confirmationLink
}

export const registerUser = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let { username, email, password, confirmPassword } = req.body

    if (!username || !email || !password || !confirmPassword) {
        next(new MissingFieldsError('Missing Username, Email, Password and/or Confirm Password')); return
    }

    if (!validator.isEmail(email)) {
        next(new InvalidEmailError('Invalid email format')); return
    }

    if (password !== confirmPassword) {
        next(new InvalidCredentialsError("Password and Confirm Password doesn't match")); return
    }

    if (String(password).length < 4) {
        next(new InvalidCredentialsError('Password must be at least 5 characters')); return
    }

    const existingUser = await UserModel.findOne({ email: { $eq: email } }).exec()
    
    if (!existingUser) {
        // User doesn't exist, create a new user
        const newUser = new UserModel({
            username,
            email,
            password
        })
        const savedUser = await newUser.save()

        const confirmationLink = generateConfirmationLink(savedUser.userCode)
        sendConfirmationEmail(email, confirmationLink)
    } else {
        if (!existingUser.confirmed) {
            // User exists, but is not confirmed. Send a new confirmation link
            const confirmationLink = generateConfirmationLink(existingUser.userCode)
            sendConfirmationEmail(email, confirmationLink)
            
            next(new UserNotConfirmedError('Email already exists but is not confirmed. Please follow the link sent to your email inbox')); return
        }
        next(new EmailAlreadyExistsError('Email already exists, please sign in instead')); return
    }

    res.status(201).json({
        message: 'Registration successful! Please check your email to confirm your account within 24 hours or your account will be deleted.'
    })
})

export const confirmUser = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Extract the confirmation code from the query parameters
    const { userCode } = req.params

    if (!userCode) {
        next(new MissingFieldsError('Confirmation code missing')); return
    }

    // Find the user with the corresponding confirmation code
    const user = await UserModel.findOne({ userCode: { $eq: userCode } }).exec()

    if (!user) {
        next(new InvalidConfirmationCodeError('Invalid confirmation code')); return
    }

    if (user.confirmed) {
        next(new UserAlreadyConfirmedError('User has already been confirmed')); return
    }

    // Update the user's status to 'confirmed'
    await user.confirmUser()
    await user.save()

    // Redirect the user or send a success message
    res.status(200).json({
        message: 'Confirmation successful! Your account has been activated.'
    })
})

export const loginUserLocal = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let { email, password } = req.body

    if (!email && !password) {
        next(new MissingFieldsError('Missing Email and Password')); return
    }
    if (!email) {
        next(new MissingFieldsError('Missing Email')); return
    }
    if (!password) {
        next(new MissingFieldsError('Missing Password')); return
    }

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
        });
    })(req, res, next)
}) 

export const logoutUser = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    req.logout(function(err) {
        if (err) { return next(err); }

        req.session.destroy(function(sessionErr) {
            if (sessionErr) {
                return next(sessionErr);
            }
            res.status(200).json({ message: "Logged out successfully" });
        })
    })
})

export const getEvents = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const populatedUser = await user.populate('events')
    res.status(200).json(populatedUser.events)
})

export const newCode = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    // Generate a new userCode
    const userCode = await user.generateNewUserCode()
    await user.save()
    res.status(200).json({ userCode })
})

export const followUser = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const followedUserId = req.params.userId
    const followedUser = await UserModel.findOne({ _id: { $eq: followedUserId } }).exec()
    const user = req.user as IUser

    if (!followedUser) {
        next(new UserNotFoundError('The user to be followed could not be found')); return
    }

    if (followedUser.id === user.id) {
        next(new UserNotFoundError('User cannot follow or un-follow themselves')); return
    }

    const followingArray = user.following as { _id: Types.ObjectId }[];
    if (followingArray.find(u => u._id.toString() === followedUser._id.toString())) {
        res.status(200).json({ message: 'User is already followed' }); return
    }

    await Promise.all([
        UserModel.findByIdAndUpdate(user._id, { $push: { following: { $each: [followedUserId] } } }).exec(),
        UserModel.findByIdAndUpdate(followedUserId, { $push: { followers: { $each: [user._id] } } }).exec()
    ])        

    res.status(200).json(followedUser)
})

export const unfollowUser = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const followedUserId = req.params.userId
    const user = req.user as IUser

    const followedUser = await UserModel.findById(followedUserId).exec();
    if (!followedUser) {
        next(new UserNotFoundError('The user to be un-followed could not be found')); return
    }

    if (followedUserId === user.id) {
        next(new UserNotFoundError('User cannot un-follow themselves')); return
    }

    const followingArray = user.following as { _id: Types.ObjectId }[];
    if (!followingArray.find(u => u._id.toString() === followedUser._id.toString())) {
        res.status(400).json({ error: 'User is not followed' }); return
    }

    await Promise.all([
        UserModel.findByIdAndUpdate(user._id, { $pull: { following: followedUserId } }).exec(),
        UserModel.findByIdAndUpdate(followedUserId, { $pull: { following: user._id } }).exec()
    ])

    res.status(200).json(followedUser)
})

export const getFollowers = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const populatedUser = await user.populate('followers') as IUserPopulated
    const followerNames = populatedUser.followers.map(follower => follower.username);
    
    res.status(200).json(followerNames)
})

export const getFollowing = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const populatedUser = await user.populate('following') as IUserPopulated
    const followingNames = populatedUser.following.map(following => following.username);
    
    res.status(200).json(followingNames)
})

export const getCommonEvents = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    const candidateUserId = req.params.userId

    if (!mongoose.Types.ObjectId.isValid(candidateUserId)) {
        res.status(400).json({ error: 'Invalid user ID format'}); return
    }

    const candidateUser = await UserModel.findById(candidateUserId).exec();

    if (!candidateUser) {
        next(new UserNotFoundError('The user to be found events in common with could not be found')); return
    }

    const userEvents = user.events as Types.ObjectId[]
    const candidateUserEvents = candidateUser.events as Types.ObjectId[]

    const commonEvents = userEvents.filter(userEvent => candidateUserEvents.includes(userEvent));
    
    res.status(200).json(commonEvents)
})

export const updateUser = asyncErrorHandler(
async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser

    const {
        newUsername,
        newPassword,
        confirmNewPassword,
        oldPassword
    } = req.body

    if (!newUsername && !newPassword && !confirmNewPassword && !oldPassword) {
        next(new MissingFieldsError('No fields submitted')); return;
    }

    // Check if any password fields are provided
    const passwordFieldsProvided = newPassword || confirmNewPassword || oldPassword

    // If any password fields are present, ensure all are present
    if (passwordFieldsProvided) {
        const allPasswordFieldsProvided = newPassword && confirmNewPassword && oldPassword
        
        if (!allPasswordFieldsProvided) {
            next(new MissingFieldsError('When setting a new password, you must provide the old password, new password, and confirm new password')); return;
        }

        if (newPassword !== confirmNewPassword) {
            next(new InvalidCredentialsError('New password and Confirm New Password does not match'))
        }

        const passwordsMatch = await user.comparePassword(oldPassword)
        if (passwordsMatch) {
            user.password = newPassword;
        } else {
            next(new InvalidCredentialsError('Old password does not match with user password')); return;
        }
    }

    // If a new username is provided, update the username
    if (newUsername) {
        user.username = newUsername;
    }

    await user.save();

    res.status(200).json(user);
});
