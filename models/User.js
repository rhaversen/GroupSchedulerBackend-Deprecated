const { 
    HashingError
  } = require('../utils/errors.js');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('./utils/logger.js');

const saltRounds = process.env.BCRYPT_SALT_ROUNDS

const { Schema } = mongoose;

const userSchema = new Schema({
    name: { type: String, required : true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    events: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    availabilities: [{ type: Schema.Types.ObjectId, ref: 'Availability' }]
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
        return;
    }
    try {
        const salt = await bcrypt.genSalt(saltRounds); //gensalt and hash is already async
        this.password = await bcrypt.hash(this.password, salt);
        return next();
    } catch (err) {
        return next(new HashingError('Error generating a password hash', err));
    }
});

// Method for comparing passwords
userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);