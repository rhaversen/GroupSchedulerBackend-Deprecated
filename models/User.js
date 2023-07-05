const { 
    HashingError
  } = require('../utils/errors');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('./utils/logger');

const saltRounds = process.env.BCRYPT_SALT_ROUNDS

const nanoidAlphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoidLength = 10;

const nanoid = () => import('nanoid').then(({ customAlphabet }) => customAlphabet(nanoidAlphabet, nanoidLength));

const { Schema } = mongoose;

const userSchema = new Schema({
    name: { type: String }, // This is how other users will recognize you. It should reflect your name or nickname. Dont worry, only users in the same events as you can see your name.
    email: { type: String, required: true, unique: true }, // This is how you will log in, no users will be able to see this
    password: { type: String, required: true }, 
    events: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    availabilities: [{ type: Schema.Types.ObjectId, ref: 'Availability' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    userCode: {type: String, unique: true, required: true}
});

// Method for comparing passwords
userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

eventSchema.methods.generateNewUserCode = async function() {
    let userCode;
    let existingUser;
    
    do {
        userCode = nanoid();
        existingUser = await this.constructor.findOne({ userCode });
    } while (existingUser);
  
    this.userCode = userCode;
    await this.save();
  };

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (this.isNew) {
        let eventCode;
        let existingEvent;
        
        do {
          eventCode = nanoid();
          existingEvent = await this.constructor.findOne({ eventCode });
        } while (existingEvent);
    
        this.eventCode = eventCode;
    }

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

//Remove event from users
eventSchema.pre('remove', async function(next) {
    try {
      // Go through all followers
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
          logger.info('Event removed')
      }
  
      next();
  
    } catch (error) {
      next(error);
    }
  });

module.exports = mongoose.model('User', userSchema);