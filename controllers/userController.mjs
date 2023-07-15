// Own modules
import errors from '../utils/errors.mjs';

// Destructuring and global variables
const {
    InvalidEmailError, 
    UserNotFoundError,
    EmailAlreadyExistsError,
    MissingFieldsError
  } = errors;

export const registerUser = async (req, res, next) => {
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
}

export const loginUser = async (req, res, next) => {
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

export const updatePassword = async (req, res, next) => {
    const user = req.user;
    await user.comparePassword(req.body.oldPassword); // Throws error if password doesn't match
    user.password = req.body.newPassword;
    await user.save();
    return res.status(200).json(user);
}

export const updateName = async (req, res, next) => {
    const user = req.user;
    user.name = req.body.newName;
    await user.save();
    return res.status(200).json(user);
}