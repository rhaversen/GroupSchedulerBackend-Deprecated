// Third-party libraries
import validator from 'validator';
import dotenv from 'dotenv';

// Own modules
import errors from '../utils/errors.mjs';
import User from '../models/User.mjs';

// Destructuring and global variables
const {
  InvalidEmailError,
  InvalidPasswordError,
  UserNotFoundError,
  EmailAlreadyExistsError,
  MissingFieldsError
} = errors;
const jwtExpiry = process.env.JWT_EXPIRY;
const jwtPersistentExpiry = process.env.JWT_PERSISTENT_EXPIRY;

// Setup
dotenv.config();

export const registerUser = async (req, res, next) => {
    let { name, email, password, stayLoggedIn } = req.body;

    if (!name || !email || !password || stayLoggedIn === undefined) {
      return next(new MissingFieldsError( 'Missing Name, Email, Password and/or "Stay logged in"' ))
    }

    email = String(email).toLowerCase();
  
    if (!validator.isEmail(email)) {
      return next(new InvalidEmailError('Invalid email format'));
    }

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) { // Check if existing user is truthy
      return next(new EmailAlreadyExistsError( 'Email already exists' ));
    }

    if(String(password).length < 5 ){
      return next(new InvalidPasswordError('Password must be longer than 5 characters'))
    }

    const newUser = new User({ name, email, password });
    const savedUser = await newUser.save();

    const jwtExpiration = stayLoggedIn ? jwtPersistentExpiry : jwtExpiry;
    const token = savedUser.generateToken(jwtExpiration);
    
    res.status(201).json({ auth: true, token: token });
}

export const loginUser = async (req, res, next) => {
    let { email, password, stayLoggedIn } = req.body;

    if (!email || !password || stayLoggedIn === undefined) {
      return next(new MissingFieldsError( 'Missing Email, Password and/or "Stay logged in"' ))
    }

    email = String(email).toLowerCase();

    if (!validator.isEmail(email)) {
      return next(new InvalidEmailError('Invalid email format'));
    }

    // Find user by email
    const user = await User.findOne({ email }).exec();

    // Check if user exists
    if (!user) {
      return next(new UserNotFoundError('User not found'));
    }

    // Check password
    await user.comparePassword(password); // Throws error if password doesn't match
    
    // User matched, return token
    const jwtExpiration = stayLoggedIn ? jwtPersistentExpiry : jwtExpiry;
    const token = user.generateToken(jwtExpiration);
    res.status(200).json({ auth: true, token: token });
}

export const getEvents = async (req, res, next) => {
    const user = req.user;
    const populatedUser = await user.populate('events').execPopulate();
    return res.status(200).json(populatedUser.events);
}

export const newCode = async (req, res, next) => {
    const user = req.user;
    // Generate a new userCode
    await user.generateNewUserCode();
    return res.status(200).json(user);
}

export const followUser = async (req, res, next) => {
    const followedUserId = req.params.userId;
    const followedUser = await User.findById(followedUserId).exec();
    const user = req.user;

    if (!followedUser) {
      return next(new UserNotFoundError('The user to be followed could not be found' ));
    }
    if (followedUser._id === user.id) {
      return next(new UserNotFoundError('User cant follow or un-follow themselves'));
    }

    user.following.push(followedUserId);
    followedUser.followers.push(user.id);

    await user.save();
    await followedUser.save();

    return res.status(200).json(followedUser);
}

export const unfollowUser = async (req, res, next) => {
    const followedUserId = req.params.userId;
    const followedUser = await User.findById(followedUserId).exec();
    const user = req.user;

    if (!followedUser) {
      return next(new UserNotFoundError('The user to be un-followed could not be found'));
    }
    if (followedUser._id === user.id) {
      return next(new UserNotFoundError('User cant follow or un-follow themselves'));
    }

    user.following.pull(followedUserId);
    followedUser.followers.pull(user.id);

    await user.save();
    await followedUser.save();

    return res.status(200).json(followedUser);
}

export const getUser = async (req, res, next) => {
    const user = req.user
    return res.status(200).json(user);
}

export const updateUser = async (req, res, next) => {
  const user = req.user;

  const {
    newName,
    newPassword,
    oldPassword
  } = req.body;

  if(newName){user.name = newName}
  if(newPassword && oldPassword){
    await user.comparePassword(oldPassword); // Throws error if password doesn't match
    user.password = newPassword
  }

  await user.save();
  return res.status(200).json(user);
}