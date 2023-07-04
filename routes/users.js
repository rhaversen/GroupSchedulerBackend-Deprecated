const { 
  InvalidEmailError, 
  UserExistsError, 
  UserNotFoundError, 
  PasswordIncorrectError, 
} = require('../utils/errors');

const express = require('express');
const router = express.Router();

const passport = require('passport');

const validator = require('validator');

const jwt = require('jsonwebtoken');

const jwtExpiry = process.env.JWT_EXPIRY

const User = require('../models/User');

const asyncErrorHandler = require('../middleware/asyncErrorHandler');

/**
 * Generate token
 */ 
const generateToken = (id, expiresIn) => {
  const payload = { id: id };
  return jwt.sign(payload, jwtSecret, { expiresIn: expiresIn });
};

/**
 * @route POST api/v1/users/register
 * @desc Register user
 * @access Public
 */
router.post('/register', asyncErrorHandler(async (req, res, next) => {
    let { name, email, password } = req.body;

    //Sanitize
    name = validator.escape(name);
    email = validator.escape(email);
    password = validator.escape(password);
  
    if (!validator.isEmail(email)) {
      return next(new InvalidEmailError('Invalid email format'));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new UserExistsError( 'Email already exists' ));
    }

    const newUser = new User({ name, email, password });
    const savedUser = await newUser.save();

    const token = generateToken(savedUser._id, jwtExpiry);
    res.status(200).json({ auth: true, token: token });
}));

/**
* @route POST api/v1/users/login
* @desc Login user and return JWT token
* @access Public
*/
router.post('/login', asyncErrorHandler(async (req, res, next) => {
  let { email, password } = req.body;

  //Sanitize
  email = validator.escape(email);
  password = validator.escape(password);

  // Find user by email
  const user = await User.findOne({ email });

  // Check if user exists
  if (!user) {
    return next(new UserNotFoundError('Email not found'));
  }

  // Check password
  const isMatch = await user.comparePassword(password);
      
  if (!isMatch) {
    return next(new PasswordIncorrectError('Password incorrect' ));
  }
    
  // User matched, return token
  const token = generateToken(user.id, jwtExpiry);
  res.status(200).json({ auth: true, token: token });
}));

/**
* @route GET api/v1/users/verify-token
* @desc Validate token and return the user id
* @access AUTHENTICATED
*/
router.get('/verify-token', passport.authenticate('jwt'), asyncErrorHandler(async(req, res) => {
    // If we get here, the JWT is valid, so we just return the id
    res.json({ id: req.user.id });
}));

/**
* @route GET api/v1/users/:eventId
* @desc Get the uses eventId's
* @access AUTHENTICATED
*/
router.get('/:userId', passport.authenticate('jwt'), asyncErrorHandler(async (req, res, next) => {
  //TODO: all of it
  const userId = req.user.id;
  const eventCode = req.params.eventCode;

  try {
      // Find the event by its id
      const event = await Event.findOne({ eventCode });

      // Check if event exists
      if (!event) {
          return next(new EventCodeError('Event not found, it might have been deleted'));
      }

      // Check if the user is a participant of the event
      if (!event.participants.includes(userId)) {
          return next(new UserNotInEventError('User not authorized to update this event'));
      }

      // Generate a new eventCode
      event.generateNewEventCode();

      return res.status(200);
  } catch (error) {
      return next(error);
  }
}));

module.exports = router;
