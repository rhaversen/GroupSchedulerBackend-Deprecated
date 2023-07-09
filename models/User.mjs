import dotenv from 'dotenv';
dotenv.config();

import errors from '../utils/errors.mjs';
const {
    HashingError
} = errors;
import logger from '../utils/logger.mjs';

import jsonwebtokenPkg from 'jsonwebtoken';
const { sign } = jsonwebtokenPkg;

const jwtSecret = process.env.JWT_SECRET

import bcryptjsPkg from 'bcryptjs';
const { compare, genSalt, hash } = bcryptjsPkg;

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS);

const nanoidAlphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoidLength = 10;

import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet(nanoidAlphabet, nanoidLength);

import mongoose, { model } from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
    name: { type: String }, // This is how other users will recognize you. It should reflect your name or nickname. Dont worry, only users in the same events as you can see your name.
    email: { type: String, required: true, unique: true }, // This is how you will log in, no users will be able to see this
    password: { type: String, required: true }, 
    events: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    availabilities: [{ type: Schema.Types.ObjectId, ref: 'Availability' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    userCode: {type: String, unique: true}
});

// Method for comparing passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    const isMatch = await compare(candidatePassword, this.password);
    if (!isMatch) {
        throw new PasswordIncorrectError('Password incorrect');
    }
    return isMatch;
};

userSchema.methods.generateNewUserCode = async function() {
    let userCode;
    let existingUser;
    
    do {
        userCode = nanoid();
        existingUser = await this.constructor.findOne({ userCode });
    } while (existingUser);
  
    this.userCode = userCode;
    await this.save();
};

userSchema.methods.generateToken = function(expiresIn) {
    const payload = { id: this._id };
    return sign(payload, jwtSecret, { expiresIn: expiresIn });
};

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (this.isNew) {
        let userCode;
        let existingUser;
        
        do {
            userCode = nanoid();
            existingUser = await this.constructor.findOne({ userCode });
        } while (existingUser);
    
        this.userCode = userCode;
    }

    if (this.isModified('password')) {
        try {
            const salt = await genSalt(saltRounds); //gensalt and hash is already async
            this.password = await hash(this.password, salt);
            return next();
        } catch (err) {
            return next(new HashingError('Error generating a password hash'));
        }
    }

    logger.info('User saved')
});

userSchema.pre('remove', async function(next) {
    try {
        // Remove user from followers following array
        for (const followerId of this.followers) {
            // Get the user
            const user = await this.constructor.findById(followerId);
    
            if (!user) {
                throw new UserNotFoundError('User not found');
            }
    
            // Remove this user from the followers's following array
            user.following = user.following.filter(followerId => followerId.toString() !== this._id.toString());
    
            // Save the user
            await user.save();
            logger.info('User removed')
        }

        // Remove user from events
        for (const eventId of this.events) {
            // Get the user
            const event = await Event.findById(eventId);

            if (!event) {
                throw new EventNotFoundError('Event not found');
            }

            // Remove this user from the events participants array
            event.participants = event.participants.filter(userId => userId.toString() !== this._id.toString());

            // Save the event
            await event.save();
            logger.info('User removed')
        }
  
        next();
  
    } catch (error) {
      next(error);
    }
  });

export default model('User', userSchema);