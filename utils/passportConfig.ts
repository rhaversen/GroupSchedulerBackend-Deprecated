// Node.js built-in modules

// Third-party libraries
import dotenv from 'dotenv'
import validator from 'validator'
import { Strategy as LocalStrategy } from 'passport-local';
//import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth';

// Own modules
import errors from './errors.js'
import UserModel, { type IUser} from '../models/User.js'
import { type PassportStatic } from 'passport'

// Setup
dotenv.config()

// Destructuring and global variables
const {
    UserNotFoundError
} = errors

// const logger = require('../utils/logger.js');

const configurePassport = (passport: PassportStatic) => {

    // Local Strategy
passport.use(new LocalStrategy({ usernameField: 'email' },
    (email, password, done) => {
        email = email.toLowerCase();

        try {
            // Validate email format
            if (!validator.isEmail(email)) {
                return done(null, false, { message: 'Invalid email format' });
            }

            // Find user by email
            UserModel.findOne({ email }).exec()
                .then(async user => {
                    // Check if user exists
                    if (!user) {
                        return done(null, false, { message: 'A user with the email ' + email + ' was not found. Please check spelling or sign up' });
                    }

                    // Check password
                    const isMatch = await user.comparePassword(password);
                    if (!isMatch) {
                        return done(null, false, { message: 'Invalid credentials' });
                    }

                    return done(null, user);
                })
                .catch(err => done(err));
        } catch (err) {
            done(err);
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

    passport.serializeUser(function(user: any, done) {
        let userId = (user as IUser).id;
        done(null, userId);
    });
    
    passport.deserializeUser(function(id, done) {
        UserModel.findById(id).exec()
        .then(user => {
            if (user) {
                done(null, user); return
            }
            done(new UserNotFoundError('User not found, it might have been deleted (JWT failed to authenticate)'), false)
        })
        .catch(err => { done(err, false) })
    });
}

export default configurePassport
