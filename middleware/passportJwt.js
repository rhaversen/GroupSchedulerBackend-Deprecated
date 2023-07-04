const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const User = require('../models/User');

const logger = require('../utils/logger.js');

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
};

module.exports = (passport) => {
    passport.use(
        new JwtStrategy(opts, async (jwt_payload, done) => {
            try {
                const user = await User.findOne({ _id: jwt_payload.id});
                if (user) {
                    return done(null, user);
                }
                return done(null, false);
            } catch (err) {
                logger.error(err.message)
                done(err, false);
            }
        })
    );
};