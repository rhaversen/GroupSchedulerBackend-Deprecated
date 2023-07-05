require('dotenv').config();
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const { 
    UserNotFoundError,
} = require('../utils/errors');

const User = require('../models/User');

//const logger = require('../utils/logger.js');

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
};

module.exports = (passport) => {
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