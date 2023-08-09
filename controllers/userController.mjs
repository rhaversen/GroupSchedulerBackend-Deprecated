// Third-party libraries
import validator from 'validator';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Own modules
import errors from '../utils/errors.mjs';
import { sendConfirmationEmail } from '../utils/mailer.mjs';
import User from '../models/User.mjs';

// Destructuring and global variables
const {
  InvalidEmailError,
  InvalidPasswordError,
  UserNotFoundError,
  EmailAlreadyExistsError,
  MissingFieldsError,
  InvalidConfirmationCodeError,
  AlreadyConfirmedError
} = errors;
const jwtExpiry = process.env.JWT_EXPIRY;

// Setup
dotenv.config();

export const registerUser = async (req, res, next) => {
    let { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password) {
      return next(new MissingFieldsError( 'Missing Username, Email and/or Password' ))
    }

    if (!validator.isEmail(email)) {
      return next(new InvalidEmailError('Invalid email format'));
    }

    if (password !== confirmPassword) {
      return next(new InvalidPasswordError( "Password and Confirm Password doesn't match" ))
    }

    email = String(email).toLowerCase();
  
    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) { // Check if existing user is truthy
      return next(new EmailAlreadyExistsError( 'Email already exists' ));
    }

    if(String(password).length <= 2 ){
      return next(new InvalidPasswordError( 'Password must be at least 3 characters' ))
    }

    // Generate a confirmation code
    const confirmationCode = crypto.randomBytes(20).toString('hex');

    console.log(confirmationCode);

    // Add status, confirmationCode, and registrationDate
    const newUser = new User({
      username,
      email,
      password,
      confirmationCode,
      registrationDate: new Date(),
    });

    // Generate confirmation link
    if(process.env.NODE_ENV === 'production'){
      const confirmationLink = `https://yourapp.com/confirm/code=${confirmationCode}`;
    } else {
      const confirmationLink = `localhost: ` + port + `/confirm/code=${confirmationCode}`;
    }

    console.log(confirmationLink);

    // Send email to the user with the confirmation link (You'll need to implement this part with your email provider)
    //await sendConfirmationEmail(email, confirmationLink);

    const savedUser = await newUser.save();
 
    return res.status(201).json({
    //  message: 'Registration successful! Please check your email to confirm your account within 24 hours.',
      userId: savedUser._id,
    });
};

export const confirmUser = async (req, res, next) => {
  // Extract the confirmation code from the query parameters
  const { code } = req.params;

  if (!code) {
    return next(new MissingFieldsError('Confirmation code missing'));
  }

  // Find the user with the corresponding confirmation code
  const user = await User.findOne({ confirmationCode: code }).exec();
  
  if (!user) {
    return next(new InvalidConfirmationCodeError('Invalid confirmation code'));
  }

  if (user.confirmed === true) {
    return next(new AlreadyConfirmedError('User has already been confirmed'));
  }

  // Update the user's status to 'confirmed'
  await user.confirmUser();

  // Redirect the user or send a success message
  return res.status(200).json({
    message: 'Confirmation successful! Your account has been activated.',
  });
};


export const loginUser = async (req, res, next) => {
    let { email, password, stayLoggedIn } = req.body;

    if (!email || !password || stayLoggedIn === undefined) {
      return next(new MissingFieldsError( 'Missing Email, Password and/or "Stay logged in"' ))
    }

    email = String(email).toLowerCase();

    if (!validator.isEmail(email)) {
      return next(new InvalidEmailError( 'Invalid email format' ));
    }

    // Find user by email
    const user = await User.findOne({ email }).exec();

    // Check if user exists
    if (!user) {
      return next(new UserNotFoundError( 'User not found' ));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ auth: false, message: 'Invalid credentials' });
    }
    
    // User matched, generate token
    const token = user.generateToken(stayLoggedIn);

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      // optionally set the SameSite attribute, e.g., 'strict' or 'lax'
    };

    if (stayLoggedIn) {
      cookieOptions.maxAge = jwtExpiry * 1000; // Assuming jwtExpiry is in seconds
    }

    // Set the JWT in a cookie
    res.cookie('token', token, cookieOptions);

    return res.status(200).json({ auth: true, token: token });
}

export const logoutUser = async (req, res, next) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true
  });
  return res.status(200).json({ message: 'Logged out successfully' }); 
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
      return next(new UserNotFoundError( 'The user to be followed could not be found' ));
    }
    if (followedUser._id === user.id) {
      return next(new UserNotFoundError( 'User cant follow or un-follow themselves' ));
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
      return next(new UserNotFoundError( 'The user to be un-followed could not be found' ));
    }
    if (followedUser._id === user.id) {
      return next(new UserNotFoundError( 'User cant follow or un-follow themselves' ));
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
    newUsername,
    newPassword,
    oldPassword
  } = req.body;

  if(newUsername){user.username = newName}
  if(newPassword && oldPassword){
    await user.comparePassword(oldPassword); // Throws error if password doesn't match
    user.password = newPassword
  }

  await user.save();
  return res.status(200).json(user);
}