// Node.js built-in modules

// Third-party libraries
import Router from 'express'

// Own modules
import { sanitizeInput } from '../middleware/sanitizer.js'
import { ensureAuthenticated } from '../utils/passportConfig.js'

// Controller functions
import {
    getCurrentUser,
    registerUser,
    requestPasswordResetEmail,
    resetPassword,
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
    updateUsername,
    deleteUser
} from '../controllers/userController.js'

// Destructuring and global variables
const router = Router()

/**
 * @route GET api/v1/users/current-user
 * @desc Get user document
 * @access Public
 */
router.get('/current-user',
    sanitizeInput,
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
* @route POST api/v1/users/request-password-reset-email
* @desc Request a password reset email
* @access Public
*/
router.post('/request-reset-password-email',
    sanitizeInput,
    requestPasswordResetEmail
)

/**
* @route PATCH api/v1/users/reset-password/:passwordResetCode
* @desc Reset a users password given a correct password reset code (From a password reset email)
* @access Public
*/
router.patch('/reset-password/:passwordResetCode',
    sanitizeInput,
    resetPassword
)

/**
 * @route POST api/v1/users/confirm/:confirmationCode
 * @desc Confirm user
 * @access Public
 */
router.post('/confirm/:confirmationCode',
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
* @access Authenticated
*/
router.delete('/logout',
    sanitizeInput,
    ensureAuthenticated,
    logoutUser
)

/**
* @route GET api/v1/users/events
* @desc Get the users events
* @access Authenticated
*/
router.get('/events',
    sanitizeInput,
    ensureAuthenticated,
    getEvents
)

/**
 * @route POST api/v1/users/new-code
 * @desc Update user with a random user code
 * @access Authenticated
*/
router.post('/new-code',
    sanitizeInput,
    ensureAuthenticated,
    newCode
)

/**
* @route PUT api/v1/users/unfollow/:userId
* @desc Follow user. Add userId to users following array, add user to userId's followers array
* @access Authenticated
*/
router.put('/following/:userId',
    sanitizeInput,
    ensureAuthenticated,
    followUser
)

/**
* @route DELETE api/v1/users/unfollow/:userId
* @desc Un-follow user. Remove userId from users following array, remove user from userId's followers array
* @access Authenticated
*/
router.delete('/unfollow/:userId',
    sanitizeInput,
    ensureAuthenticated,
    unfollowUser
)

/**
* @route GET api/v1/users/followers
* @desc Get the users following the logged in user (An array of names)
* @access Authenticated
*/
router.get('/followers',
    sanitizeInput,
    ensureAuthenticated,
    getFollowers
)

/**
* @route GET api/v1/users/following
* @desc Get the users being followed by the logged in user (An array of names)
* @access Authenticated
*/
router.get('/following',
    sanitizeInput,
    ensureAuthenticated,
    getFollowing
)

/**
* @route GET api/v1/users/:userId/common-events
* @desc Get the events in common with a user
* @access Authenticated
*/
router.get('/:userId/common-events',
    sanitizeInput,
    ensureAuthenticated,
    getCommonEvents
)

/**
* @route PATCH api/v1/users/update-password
* @desc Update users password
* @access Authenticated
*/
router.patch('/update-password',
    sanitizeInput,
    ensureAuthenticated,
    updatePassword
)

/**
* @route PATCH api/v1/users/update-username
* @desc Update users name
* @access Authenticated
*/
router.patch('/update-username',
    sanitizeInput,
    ensureAuthenticated,
    updateUsername
)

/**
* @route DELETE api/v1/users/
* @desc Delete a user,
* @access Authenticated
*/
router.delete('/',
    sanitizeInput,
    ensureAuthenticated,
    deleteUser
)

export default router
