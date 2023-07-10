// Node.js built-in modules

// Third-party libraries
import dotenv from 'dotenv';
import { Router } from 'express';
import passport from 'passport';
import validator from 'validator';

// Own modules
import errors from '../utils/errors.mjs';
import User from '../models/User.mjs';
import asyncErrorHandler from '../middleware/asyncErrorHandler.mjs';

// Setup
dotenv.config();

// Destructuring and global variables
const {
  InvalidEmailError, 
  UserNotFoundError,
  EmailAlreadyExistsError,
  MissingFieldsError
} = errors;
const router = Router();
const jwtExpiry = process.env.JWT_EXPIRY;

// Sanitize middleware
const sanitizeInput = (req, res, next) => {
  sanitizeObject(req.body);
  next();
};

function sanitizeObject(obj) {
  for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
              sanitizeObject(obj[key]);
          } else {
              obj[key] = validator.escape(String(obj[key]));
          }
      }
  }
}

/**
 * @route POST api/v1/users
 * @desc Register user
 * @access Public
 */
router.post('/',
  sanitizeInput,
  asyncErrorHandler(async (req, res, next) => {
    let { name, email, password } = req.body;

    if (!email || !password) {
      return next(new MissingFieldsError( 'Missing Email and/or Password field' ))
    }
  
    if (!validator.isEmail(email)) {
      return next(new InvalidEmailError('Invalid email format'));
    }

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return next(new EmailAlreadyExistsError( 'Email already exists' ));
    }

    const newUser = new User({ name, email, password });
    const savedUser = await newUser.save();

    const token = savedUser.generateToken(jwtExpiry);
    res.status(201).json({ auth: true, token: token });
  })
);

/**
* @route POST api/v1/users/login
* @desc Login user and return JWT token
* @access Public
*/
router.post('/login',
  sanitizeInput,
  asyncErrorHandler(async (req, res, next) => {
    let { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).exec();

    // Check if user exists
    if (!user) {
      return next(new UserNotFoundError('Email not found'));
    }

    // Check password
    await user.comparePassword(password); // Throws error if password doesn't match
    
    // User matched, return token
    const token = user.generateToken(jwtExpiry);
    res.status(200).json({ auth: true, token: token });
  })
);

/**
* @route GET api/v1/users/events
* @desc Get the users events
* @access AUTHENTICATED
*/
router.get('/events',
  passport.authenticate('jwt', { session: false }),
  asyncErrorHandler(async (req, res, next) => {
    const user = req.user;
    const populatedUser = await user.populate('events').exec();
    return res.status(200).json(populatedUser);
  })
);

/**
 * @route POST api/v1/users/new-code
 * @desc Update user with a random user code
 * @access AUTHENTICATED
*/
router.post('/new-code',
  passport.authenticate('jwt', { session: false }),
  asyncErrorHandler(async (req, res, next) => {
    const user = req.user;
    // Generate a new userCode
    await user.generateNewUserCode();
    return res.status(200).json(user.userCode);
  })
);

/**
* @route PUT api/v1/users/following/:userId
* @desc Follow user. Add userId to users following array, add user to userId's followers array
* @access AUTHENTICATED
*/
router.put('/following/:userId',
  passport.authenticate('jwt', { session: false }),
  asyncErrorHandler(async (req, res, next) => {
    const followedUserId = req.params.userId;
    const followedUser = await User.findById(followedUserId).exec();

    if (!followedUser) {
      return next(new UserNotFoundError('The user to be followed could not be found' ));
    }

    const user = req.user;
    user.following.push(followedUserId);
    followedUser.followers.push(user.id);


    await user.save();
    await followedUser.save();

    return res.status(200).json(followedUser);
  })
);

/**
* @route DELETE api/v1/users/following/:userId
* @desc Un-follow user. Remove userId from users following array, remove user from userId's followers array
* @access AUTHENTICATED
*/
router.delete('/following/:userId',
  passport.authenticate('jwt', { session: false }),
  asyncErrorHandler(async (req, res, next) => {
    const followedUserId = req.params.userId;
    const followedUser = await User.findById(followedUserId).exec();

    if (!followedUser) {
      return next(new UserNotFoundError('The user to be un-followed could not be found'));
    }

    const user = req.user;
    user.following.pull(followedUserId);
    followedUser.followers.pull(user.id);

    await user.save();
    await followedUser.save();

    return res.status(200).json(followedUser);
  })
);

/**
* @route GET api/v1/users
* @desc Get signed in user
* @access AUTHENTICATED
*/
router.get('/',
  passport.authenticate('jwt', { session: false }),
  asyncErrorHandler(async (req, res, next) => {
    return res.status(200).json(req.user);
  })
);

/**
* @route PATCH api/v1/users/update-password
* @desc Update users password
* @access AUTHENTICATED
*/
router.patch('/update-password',
  passport.authenticate('jwt', { session: false }),
  asyncErrorHandler(async (req, res, next) => {
    const user = req.user;
    await user.comparePassword(req.body.oldPassword); // Throws error if password doesn't match
    user.password = req.body.newPassword;
    await user.save();
    return res.status(200).json(user);
  })
);

/**
* @route PATCH api/v1/users/update-name
* @desc Update users name
* @access AUTHENTICATED
*/
router.patch('/update-name',
  passport.authenticate('jwt', { session: false }),
  asyncErrorHandler(async (req, res, next) => {
    const user = req.user;
    user.name = req.body.newName;
    await user.save();
    return res.status(200).json(user);
  })
);

export default router;