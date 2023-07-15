// Node.js built-in modules

// Third-party libraries
import dotenv from 'dotenv';
import { Router } from 'express';
import passport from 'passport';
import validator from 'validator';

// Own modules
import errors from '../utils/errors.mjs';
import User from '../models/User.mjs';

// Controller functions
import {
  registerUser,
  loginUser,
  getEvents,
  newCode,
  followUser,
  unfollowUser,
  updatePassword,
  updateName
} from '../controllers/userController.mjs';


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
  registerUser
);

/**
* @route POST api/v1/users/login
* @desc Login user and return JWT token
* @access Public
*/
router.post('/login',
  sanitizeInput,
  loginUser
);

/**
* @route GET api/v1/users/events
* @desc Get the users events
* @access AUTHENTICATED
*/
router.get('/events',
  passport.authenticate('jwt', { session: false }),
  getEvents
);

/**
 * @route POST api/v1/users/new-code
 * @desc Update user with a random user code
 * @access AUTHENTICATED
*/
router.post('/new-code',
  passport.authenticate('jwt', { session: false }),
  newCode
);

/**
* @route PUT api/v1/users/following/:userId
* @desc Follow user. Add userId to users following array, add user to userId's followers array
* @access AUTHENTICATED
*/
router.put('/following/:userId',
  passport.authenticate('jwt', { session: false }),
  followUser
);

/**
* @route DELETE api/v1/users/following/:userId
* @desc Un-follow user. Remove userId from users following array, remove user from userId's followers array
* @access AUTHENTICATED
*/
router.delete('/following/:userId',
  passport.authenticate('jwt', { session: false }),
  unfollowUser
);

/**
* @route GET api/v1/users
* @desc Get signed in user
* @access AUTHENTICATED
*/
router.get('/',
  passport.authenticate('jwt', { session: false }),
  getUser
);

/**
* @route PATCH api/v1/users/update-password
* @desc Update users password
* @access AUTHENTICATED
*/
router.patch('/update-password',
  passport.authenticate('jwt', { session: false }),
  updatePassword
);

/**
* @route PATCH api/v1/users/update-name
* @desc Update users name
* @access AUTHENTICATED
*/
router.patch('/update-name',
  passport.authenticate('jwt', { session: false }),
  updateName
);

export default router;