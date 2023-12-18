// Node.js built-in modules

// Third-party libraries
import validator from 'validator'
import { compare } from 'bcrypt'
import { Strategy as LocalStrategy } from 'passport-local'
// import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth';

// Own modules
import UserModel, { type IUser } from '../models/User.js'
import { type PassportStatic } from 'passport'
import { type NextFunction, type Request, type Response } from 'express'
import { InvalidCredentialsError, InvalidEmailError, UserNotFoundError } from './errors.js'

// Destructuring and global variables

export const ensureAuthenticated =
    (req: Request, res: Response, next: NextFunction): void => {
        if (req.isAuthenticated()) {
            next()
            return
        }
        // If not authenticated, you can redirect or send an error response
        res.status(401).json({ message: 'Unauthorized' })
    }

const configurePassport = (passport: PassportStatic): void => {
    // Local Strategy
    passport.use(new LocalStrategy({ usernameField: 'email' },
        (email, password, done) => {
            try {
                // Validate email format
                if (!validator.isEmail(email)) {
                    done(null, false, { message: 'Invalid email format' })
                    return
                }
                // Find user by email
                UserModel.findOne({ email }).exec()
                    .then(async user => {
                        // Check if user exists
                        if (user === null || user === undefined) {
                            done(null, false, { message: 'A user with the email ' + email + ' was not found. Please check spelling or sign up' })
                            return
                        }

                        // Check password
                        const isMatch = await compare(password, user.password)
                        if (!isMatch) {
                            done(null, false, { message: 'Invalid credentials' })
                            return
                        }
                        done(null, user)
                    })
                    .catch(err => {
                        done(null, false)
                    })
            } catch (err) {
                done(null, false)
            }
        })
    )

    /*
    // Google OAuth2.0 Strategy
    passport.use(new GoogleStrategy({
        clientID: 'YOUR_GOOGLE_CLIENT_ID',
        clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
        callbackURL: 'http://www.example.com/auth/google/callback'
    },
    function(accessToken, refreshToken, profile, done) {
        // ... your authentication logic
    }));
*/

    passport.serializeUser(function (user: any, done) {
        const userId = (user as IUser).id
        done(null, userId)
    })

    passport.deserializeUser(function (id, done) {
        UserModel.findById(id).exec()
            .then(user => {
                if (user === null || user === undefined) {
                    done(new UserNotFoundError('User not found, it might have been deleted (User failed to deserialize)'), false)
                }
                done(null, user)
            })
            .catch(err => {
                done(err, false)
            })
    })
}

export default configurePassport
