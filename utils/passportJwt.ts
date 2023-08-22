// Node.js built-in modules

// Third-party libraries
import dotenv from 'dotenv'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'

// Own modules
import errors from './errors.js'
import User from '../models/User.js'

// Setup
dotenv.config()

// Destructuring and global variables
const {
    UserNotFoundError
} = errors

// const logger = require('../utils/logger.js');

const configurePassport = (passport) => {
    const opts = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET
    }

    passport.use(
        new JwtStrategy(opts, async (jwt_payload, done) => {
            const user = await User.findById(jwt_payload.id).exec()
            if (user) {
                return done(null, user)
            }
            return done(new UserNotFoundError('User not found, it might have been deleted (JWT failed to authenticate)'), false)
        })
    )
}

export default configurePassport
