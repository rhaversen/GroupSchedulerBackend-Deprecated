// Node.js built-in modules

// Third-party libraries
import dotenv from 'dotenv'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'

// Own modules
import errors from './errors.js'
import UserModel from '../models/User.js'
import { type PassportStatic } from 'passport'

// Setup
dotenv.config()

// Destructuring and global variables
const {
    UserNotFoundError
} = errors

// const logger = require('../utils/logger.js');

const configurePassport = (passport: PassportStatic) => {
    const opts = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET
    }

    passport.use(
        new JwtStrategy(opts, (jwt_payload: { id: any }, done): void => {
            UserModel.findById(jwt_payload.id).exec()
                .then(user => {
                    if (user) {
                        done(null, user); return
                    }
                    done(new UserNotFoundError('User not found, it might have been deleted (JWT failed to authenticate)'), false)
                })
                .catch(err => { done(err, false) })
        })
    )
}

export default configurePassport
