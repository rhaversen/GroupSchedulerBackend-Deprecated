const mongoose = require('mongoose');
const User = require('./User.js');
const logger = require('./utils/logger.js');

const { Schema } = mongoose;

const nanoidAlphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoidLength = 10;

const nanoid = () => import('nanoid').then(({ customAlphabet }) => customAlphabet(nanoidAlphabet, nanoidLength));


const eventSchema = new Schema({
  eventName: { type: String, required: true },
  eventDescription: { type: String },
  startDate: { type: Date, required: true, validate: { validator: function(value) { return value < this.endDate; }, message: 'Start date must be before end date' } },
  endDate: { type: Date, required: true, validate: { validator: function(value) { return value > this.startDate; }, message: 'End date must be after start date' } },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  eventCode: {type: String, unique: true, required: true}
});

eventSchema.pre('save', async function(next) {
  if (!this.isNew) {
    next();
    return;
  }

  //Delete event if empty
  try {
    if (this.participants.length === 0) {
      await this.remove();
      return;
    }
  } catch (err) {
    next(err);
    return;
  }

  let eventCode;
  let existingEvent;
  
  do {
    eventCode = nanoid();
    existingEvent = await this.constructor.findOne({ eventCode });
  } while (existingEvent);

  this.eventCode = eventCode;

  logger.info('Event created')
  next();
});

//Remove event from users
eventSchema.pre('remove', async function(next) {
  try {
    // Go through all participants
    for (const participantId of this.participants) {
        // Get the user
        const user = await User.findById(participantId);

        if (!user) {
            throw new Error('User not found');
        }

        // Remove the event from the user's events array
        user.events = user.events.filter(eventId => eventId.toString() !== this._id.toString());

        // Save the user
        await user.save();
        logger.info('Event removed')
    }

    next();

  } catch (error) {
    next(error);
  }
});

eventSchema.methods.generateNewEventCode = async function() {
  let eventCode;
  let existingEvent;
  
  do {
    eventCode = nanoid();
    existingEvent = await this.constructor.findOne({ eventCode });
  } while (existingEvent);

  this.eventCode = eventCode;
  await this.save();
};


module.exports = mongoose.model('Event', eventSchema);