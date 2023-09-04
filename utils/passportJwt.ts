// Node.js built-in modules

// Third-party libraries
import dotenv from 'dotenv'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { Request } from 'express';

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
        jwtFromRequest: (req: Request): string => {
            let token = null;
            token = req?.cookies['token'];
            return token;
        },
        secretOrKey: String(process.env.JWT_SECRET),
        audience: 'localhost'
    }

    passport.use(
        new JwtStrategy(opts, function(jwt_payload: string, done): void {
            UserModel.findById(jwt_payload.sub).exec()
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
