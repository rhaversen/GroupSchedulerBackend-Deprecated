// Node.js built-in modules

// Third-party libraries
import Router from 'express'

// Own modules
import {
    sanitizeInput
} from '../middleware/sanitizer.js'

// Controller functions
import {
    getCurrentUser,
    registerUser,
    sendPasswordResetEmail,
    confirmUser,
    loginUserLocal,
    logoutUser,
    getEvents,
    newCode,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getCommonEvents,
    updatePassword,
    updateUsername
} from '../controllers/userController.js'

import { ensureAuthenticated } from '../utils/passportConfig.js'

// Destructuring and global variables
const router = Router()

/**
 * @route GET api/v1/users/current-user
 * @desc Validate session
 * @access Public
 */
router.get('/current-user',
    ensureAuthenticated,
    getCurrentUser
)

/**
 * @route POST api/v1/users
 * @desc Register user
 * @access Public
 */
router.post('/',
    sanitizeInput,
    registerUser
)

/**
* @route POST api/v1/users/send-password-reset-email
* @desc Send a password reset email
* @access Public
*/
router.post('/send-reset-password-email',
    sanitizeInput,
    sendPasswordResetEmail
)

/**
 * @route POST api/v1/users/confirm/:userCode
 * @desc Confirm user
 * @access Public
 */
router.post('/confirm/:userCode',
    sanitizeInput,
    confirmUser
)

/**
* @route POST api/v1/users/login-local
* @desc Login user and return session cookie
* @access Public
*/
router.post('/login-local',
    sanitizeInput,
    loginUserLocal
)

/**
* @route DELETE api/v1/users/logout
* @desc Logout user and delete session from store
* @access AUTHENTICATED
*/
router.delete('/logout',
    ensureAuthenticated,
    sanitizeInput,
    logoutUser
)

/**
* @route GET api/v1/users/events
* @desc Get the users events
* @access AUTHENTICATED
*/
router.get('/events',
    ensureAuthenticated,
    getEvents
)

/**
 * @route POST api/v1/users/new-code
 * @desc Update user with a random user code
 * @access AUTHENTICATED
*/
router.post('/new-code',
    ensureAuthenticated,
    newCode
)

/**
* @route PUT api/v1/users/unfollow/:userId
* @desc Follow user. Add userId to users following array, add user to userId's followers array
* @access AUTHENTICATED
*/
router.put('/following/:userId',
    ensureAuthenticated,
    followUser
)

/**
* @route DELETE api/v1/users/unfollow/:userId
* @desc Un-follow user. Remove userId from users following array, remove user from userId's followers array
* @access AUTHENTICATED
*/
router.delete('/unfollow/:userId',
    ensureAuthenticated,
    unfollowUser
)

/**
* @route GET api/v1/users/followers
* @desc Get the users following the logged in user (An array of names)
* @access AUTHENTICATED
*/
router.get('/followers',
    ensureAuthenticated,
    getFollowers
)

/**
* @route GET api/v1/users/following
* @desc Get the users being followed by the logged in user (An array of names)
* @access AUTHENTICATED
*/
router.get('/following',
    ensureAuthenticated,
    getFollowing
)

/**
* @route GET api/v1/users/:userId/common-events
* @desc Get the events in common with a user
* @access AUTHENTICATED
*/
router.get('/:userId/common-events',
    ensureAuthenticated,
    getCommonEvents
)

/**
* @route PATCH api/v1/users/update-password
* @desc Update users password
* @access AUTHENTICATED
*/
router.patch('/update-password',
    ensureAuthenticated,
    updatePassword
)

/**
* @route PATCH api/v1/users/update-username
* @desc Update users name
* @access AUTHENTICATED
*/
router.patch('/update-username',
    ensureAuthenticated,
    updateUsername
)

export default router
