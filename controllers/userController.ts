// Node.js built-in modules
import config from 'config'

// Third-party libraries
import validator from 'validator'
import dotenv from 'dotenv'
import { type Request, type Response, type NextFunction } from 'express'

// Own modules
import errors from '../utils/errors.js'
import { sendConfirmationEmail } from '../utils/mailer.js'
import User, { type IUser } from '../models/User.js'
import asyncErrorHandler from '../utils/asyncErrorHandler.js'

// Destructuring and global variables
const {
    InvalidEmailError,
    InvalidPasswordError,
    UserNotFoundError,
    EmailAlreadyExistsError,
    MissingFieldsError,
    InvalidConfirmationCodeError,
    UserAlreadyConfirmedError,
    UserNotConfirmedError
} = errors

// Config
const jwtExpiry = Number(config.get('jwt.expiry'))
const jwtPersistentExpiry = Number(config.get('jwt.persistentExpiry'))
const nextJsPort = config.get('ports.nextJs')
const frontendDomain = config.get('frontend.domain')
const cookieOptions = config.get('cookieOptions')

// Setup
dotenv.config()

export const registerUser = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let { username, email, password, confirmPassword } = req.body

    if (!username || !email || !password) {
        next(new MissingFieldsError('Missing Username, Email and/or Password')); return
    }

    if (!validator.isEmail(email)) {
        next(new InvalidEmailError('Invalid email format')); return
    }

    if (password !== confirmPassword) {
        next(new InvalidPasswordError("Password and Confirm Password doesn't match")); return
    }

    email = String(email).toLowerCase()

    const existingUser = await User.findOne({ email }).exec()
    if (existingUser) { // Check if existing user is truthy
        if (!existingUser.confirmed) {
            next(new UserNotConfirmedError('Email already exists but is not confirmed. Please follow the link sent to your email inbox')); return
        }
        next(new EmailAlreadyExistsError('Email already exists, please sign in instead')); return
    }

    if (String(password).length < 4) {
        next(new InvalidPasswordError('Password must be at least 5 characters')); return
    }

    const newUser = new User({
        username,
        email,
        password
    })

    const savedUser = await newUser.save()

    const userCode = savedUser.userCode

    let confirmationLink: string
    // Generate confirmation link
    if (process.env.NODE_ENV === 'production') {
        confirmationLink = `http://${frontendDomain}/confirm?userCode=${userCode}`
    } else {
        confirmationLink = `http://${frontendDomain}:${nextJsPort}/confirm?userCode=${userCode}`
    }

    console.log(confirmationLink)

    // Send email to the user with the confirmation link
    sendConfirmationEmail(email, confirmationLink)

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
    const user = await User.findOne({ userCode }).exec()

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

export const loginUser = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let { email, password, stayLoggedIn } = req.body

    if (!email || !password || stayLoggedIn === undefined) {
        next(new MissingFieldsError('Missing Email, Password and/or "Stay logged in"')); return
    }

    email = String(email).toLowerCase()

    if (!validator.isEmail(email)) {
        next(new InvalidEmailError('Invalid email format')); return
    }

    // Find user by email
    const user = await User.findOne({ email }).exec()

    // Check if user exists
    if (!user) {
        next(new UserNotFoundError('A user with the email ' + email + ' was not found. Please check spelling or sign up')); return
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
        res.status(401).json({ auth: false, message: 'Invalid credentials' })
        return
    }

    // User matched, generate token
    const token = user.generateToken(stayLoggedIn)

    if (stayLoggedIn) {
        cookieOptions.maxAge = jwtPersistentExpiry * 1000 // Assuming jwtExpiry is in seconds
    } else {
        cookieOptions.maxAge = jwtExpiry * 1000 // Assuming jwtExpiry is in seconds
    }

    // Set the JWT in a cookie
    res.cookie('token', token, cookieOptions)

    res.status(200).json({ auth: true, token })
})

export const logoutUser = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true
    })
    res.status(200).json({ message: 'Logged out successfully' })
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
    const followedUser = await User.findById(followedUserId).exec()
    const user = req.user as IUser

    if (!followedUser) {
        next(new UserNotFoundError('The user to be followed could not be found')); return
    }
    if (followedUser._id === user.id) {
        next(new UserNotFoundError('User cant follow or un-follow themselves')); return
    }

    user.following.push(followedUserId)
    followedUser.followers.push(user.id)

    await user.save()
    await followedUser.save()

    res.status(200).json(followedUser)
})

export const unfollowUser = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const followedUserId = req.params.userId
    const followedUser = await User.findById(followedUserId).exec()
    const user = req.user as IUser

    if (!followedUser) {
        next(new UserNotFoundError('The user to be un-followed could not be found')); return
    }
    if (followedUser._id === user.id) {
        next(new UserNotFoundError('User cant follow or un-follow themselves')); return
    }

    user.following.pull(followedUserId)
    followedUser.followers.pull(user.id)

    await user.save()
    await followedUser.save()

    res.status(200).json(followedUser)
})

export const getUser = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser
    res.status(200).json(user)
})

export const updateUser = asyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as IUser

    const {
        newUsername,
        newPassword,
        oldPassword
    } = req.body

    if (newUsername) { user.username = newUsername }
    if (newPassword && oldPassword) {
        await user.comparePassword(oldPassword) // Throws error if password doesn't match
        user.password = newPassword
    }

    await user.save()
    res.status(200).json(user)
})
