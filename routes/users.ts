// Node.js built-in modules

// Third-party libraries
import Router from 'express'
import passport from 'passport'

// Own modules
import {
    sanitizeInput
} from '../middleware/sanitizer.js'

// Controller functions
import {
    registerUser,
    confirmUser,
    loginUser,
    logoutUser,
    getEvents,
    newCode,
    followUser,
    unfollowUser,
    getUser,
    updateUser
} from '../controllers/userController.js'

// Destructuring and global variables
const router = Router()

/**
 * @route GET api/v1/users/validate-jwt
 * @desc Validate JWT
 * @access Public
 */
router.get('/validate-jwt',
    passport.authenticate('jwt', { session: false }),
    // If we get here, the JWT is valid, so we just respond with a success message
    function (req, res) {
        res.status(200).json({
            message: 'User has valid JWT.'
        })
    }
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
 * @route POST api/v1/users/confirm/:code
 * @desc Confirm user
 * @access Public
 */
router.post('/confirm/:userCode',
    sanitizeInput,
    confirmUser
)

/**
* @route POST api/v1/users/login
* @desc Login user and return JWT
* @access Public
*/
router.post('/login',
    sanitizeInput,
    loginUser
)

/**
* @route DELETE api/v1/users/logout
* @desc Logout user and clear JWT
* @access AUTHENTICATED
*/
router.delete('/logout',
    passport.authenticate('jwt', { session: false }),
    sanitizeInput,
    logoutUser
)

/**
* @route GET api/v1/users/events
* @desc Get the users events
* @access AUTHENTICATED
*/
router.get('/events',
    passport.authenticate('jwt', { session: false }),
    getEvents
)

/**
 * @route POST api/v1/users/new-code
 * @desc Update user with a random user code
 * @access AUTHENTICATED
*/
router.post('/new-code',
    passport.authenticate('jwt', { session: false }),
    newCode
)

/**
* @route PUT api/v1/users/following/:userId
* @desc Follow user. Add userId to users following array, add user to userId's followers array
* @access AUTHENTICATED
*/
router.put('/following/:userId',
    passport.authenticate('jwt', { session: false }),
    followUser
)

/**
* @route DELETE api/v1/users/following/:userId
* @desc Un-follow user. Remove userId from users following array, remove user from userId's followers array
* @access AUTHENTICATED
*/
router.delete('/following/:userId',
    passport.authenticate('jwt', { session: false }),
    unfollowUser
)

/**
* @route GET api/v1/users
* @desc Get signed in user
* @access AUTHENTICATED
*/
router.get('/',
    passport.authenticate('jwt', { session: false }),
    getUser
)

/**
* @route PATCH api/v1/users/update-password
* @desc Update users name and/or password
* @access AUTHENTICATED
*/
router.patch('/update-user',
    passport.authenticate('jwt', { session: false }),
    updateUser
)

export default router
