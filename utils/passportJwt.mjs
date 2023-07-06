import dotenv from 'dotenv';
dotenv.config();

import { Strategy as JwtStrategy } from 'passport-jwt';
import { ExtractJwt } from 'passport-jwt';

import errors from './errors.mjs';
const {
    UserNotFoundError,
} = errors;

import User from '../models/User.mjs';

//const logger = require('../utils/logger.js');

const configurePassport = (passport) => {
    const opts = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET
    };

    passport.use(
        new JwtStrategy(opts, async (jwt_payload, done) => {
            const user = await User.findById(jwt_payload.id);
            if (user) {
                return done(null, user);
            }
            return done(new UserNotFoundError('User not found, it might have been deleted (JWT failed to authenticate)'), false);
        })
    );
};

export default configurePassport;