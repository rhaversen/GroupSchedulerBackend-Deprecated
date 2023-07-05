const { 
    HashingError
  } = require('../utils/errors');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('./utils/logger');

const saltRounds = process.env.BCRYPT_SALT_ROUNDS

const { Schema } = mongoose;

const userSchema = new Schema({
    name: { type: String }, // This is how other users will recognize you. It should reflect your name or nickname. Dont worry, only users in the same events as you can see your name.
    email: { type: String, required: true, unique: true }, // This is how you will log in, no users will be able to see this
    password: { type: String, required: true }, 
    events: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    availabilities: [{ type: Schema.Types.ObjectId, ref: 'Availability' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(saltRounds); //gensalt and hash is already async
            this.password = await bcrypt.hash(this.password, salt);
            return next();
        } catch (err) {
            return next(new HashingError('Error generating a password hash', err));
        }
    }

    logger.info('User saved')
});

// Method for comparing passwords
userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);