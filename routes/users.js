const { 
  InvalidEmailError, 
  UserNotFoundError, 
  PasswordIncorrectError, 
} = require('../utils/errors');

const express = require('express');
const router = express.Router();

const passport = require('passport');

const validator = require('validator');

const jwt = require('jsonwebtoken');

const jwtExpiry = process.env.JWT_EXPIRY
const jwtSecret = process.env.JWT_SECRET

const User = require('../models/User');

const asyncErrorHandler = require('../middleware/asyncErrorHandler');

// Generate token
const generateToken = (id, expiresIn) => {
  const payload = { id: id };
  return jwt.sign(payload, jwtSecret, { expiresIn: expiresIn });
};

/**
 * @route POST api/v1/users
 * @desc Register user
 * @access Public
 */
router.post('/',
  asyncErrorHandler(async (req, res, next) => {
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
      return next(new UserNotFoundError( 'Email already exists' ));
    }

    const newUser = new User({ name, email, password });
    const savedUser = await newUser.save();

    const token = generateToken(savedUser._id, jwtExpiry);
    res.status(200).json({ auth: true, token: token });
  })
);

/**
* @route POST api/v1/users/login
* @desc Login user and return JWT token
* @access Public
*/
router.post('/login',
  asyncErrorHandler(async (req, res, next) => {
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
  })
);

/**
* @route GET api/v1/users/events
* @desc Get the users events
* @access AUTHENTICATED
*/
router.get('/events',
  passport.authenticate('jwt'),
  asyncErrorHandler(async (req, res, next) => {
    const user = req.user;
    const populatedUser = user.populate('events');
    await user.execPopulate();
    return res.status(200).json(populatedUser);
  })
);

/**
 * @route POST api/v1/users/new-code
 * @desc Update user with a random user code
 * @access AUTHENTICATED
*/
router.post('/new-code',
    passport.authenticate('jwt'),
    asyncErrorHandler(async (req, res, next) => {
        const user = req.user;
        // Generate a new userCode
        user.generateNewUserCode();
        return res.status(200).json(user.userCode);
    })
);

/**
* @route PUT api/v1/users/following/:userId
* @desc Follow user. Add userId to users following array, add user to userId's followers array
* @access AUTHENTICATED
*/
router.put('/following/:userId',
  passport.authenticate('jwt'),
  asyncErrorHandler(async (req, res, next) => {
    const followedUserId = req.params.userId;
    const followedUser = await User.findById(followedUserId);

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
* @desc Unfollow user. Remove userId from users following array, remove user from userId's followers array
* @access AUTHENTICATED
*/
router.delete('/following/:userId',
  passport.authenticate('jwt'),
  asyncErrorHandler(async (req, res, next) => {
    const followedUserId = req.params.userId;
    const followedUser = await User.findById(followedUserId);

    if (!followedUser) {
      return next(new UserNotFoundError('The user to be unfollowed could not be found'));
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
  passport.authenticate('jwt'),
  asyncErrorHandler(async (req, res, next) => {
    return res.status(200).json(req.user);
  })
);

/**
* @route PATCH api/v1/users/:old-password/:new-password
* @desc Update users password
* @access AUTHENTICATED
*/
router.patch('/update-password/:old-password/:new-password',
  passport.authenticate('jwt'),
  asyncErrorHandler(async (req, res, next) => {
    const user = req.user;
    if (!req.user.comparePassword(req.params.old-password)){
      return next(new PasswordIncorrectError('Password incorrect' ));
    }
    user.password = req.params.new-password;
    await user.save();
    return res.status(200).json(user);
  })
);

/**
* @route PATCH api/v1/users/:new-name
* @desc Update users name
* @access AUTHENTICATED
*/
router.patch('/:new-name',
  passport.authenticate('jwt'),
  asyncErrorHandler(async (req, res, next) => {
    const user = req.user;
    user.name = req.params.new-name;
    await user.save();
    return res.status(200).json(user);
  })
);

module.exports = router;
