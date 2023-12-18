// file deepcode ignore NoHardcodedPasswords/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore NoHardcodedCredentials/test: Hardcoded credentials are only used for testing purposes
// file deepcode ignore HardcodedNonCryptoSecret/test: Hardcoded credentials are only used for testing purposes

// Third-party libraries
import { parse } from 'cookie'

// Own modules
import server, { agent, chai } from './testSetup.js'
import UserModel, { type IUser } from '../src/models/User.js'
import EventModel, { type IEvent } from '../src/models/Event.js'
import { getExpressPort, getSessionExpiry } from '../src/utils/setupConfig.js'
import { compare } from 'bcrypt'

// Global variables and setup
const { expect } = chai

// Configs
const sessionExpiry = getSessionExpiry()
const expressPort = getExpressPort()

describe('Get Current User Endpoint GET /v1/users/current-user', function () {
    let testUser: IUser
    let testEvent: IEvent

    beforeEach(async function () {
        testUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'testpassword'
        })
        testUser.confirmUser()
        await testUser.save()

        testEvent = new EventModel({
            eventName: 'TestEvent',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await testEvent.save()

        await UserModel.findByIdAndUpdate(testUser._id, { $push: { events: testEvent._id } }).exec()

        const user = { email: testUser.email, password: 'testpassword', stayLoggedIn: true }

        // Log the user in to get a token
        await agent.post('/v1/users/login-local').send(user)
    })

    it('should fetch current user details successfully', async function () {
        const res = await agent.get('/v1/users/current-user')

        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('username')
        expect(res.body.username).to.be.equal(testUser.username)
        expect(res.body).to.have.property('email')
        expect(res.body.email).to.be.equal(testUser.email)
        expect(res.body).to.have.property('events')
        expect(res.body.events).to.be.a('array')
        expect(res.body.events[0]).to.be.equal(testEvent.id)
        expect(res.body).to.have.property('blockedDates')
        expect(res.body.blockedDates).to.be.a('array')
        expect(res.body.blockedDates).to.be.empty
        expect(res.body.confirmed).to.be.true
        expect(res.body).to.not.have.property('expirationDate')
    })

    it('should fail due to lack of authentication', async function () {
        const newAgent = chai.request.agent(server.app)
        const res = await newAgent.get('/v1/users/current-user')

        expect(res).to.have.status(401)
        expect(res.body.message).to.be.equal('Unauthorized')

        newAgent.close()
    })
})

describe('User Registration Endpoint POST /v1/users', function () {
    const testUser = {
        username: 'Test User',
        email: 'testuser@gmail.com',
        password: 'testpassword',
        confirmPassword: 'testpassword'
    }

    it('should successfully register a new user', async function () {
        //        const csrfToken = await getCSRFToken(agent);
        const res = await agent
            .post('/v1/users')
        //            .set('csrf-token', csrfToken)
            .send(testUser)

        expect(res).to.have.status(201)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('message')
        expect(res.body.message).to.be.equal('Registration successful! Please check your email to confirm your account within 24 hours or your account will be deleted.')
    })

    it('should successfully login the new user', async function () {
        const res = await agent.post('/v1/users').send(testUser)

        expect(res.body).to.have.property('auth')
        expect(res).to.have.cookie('connect.sid')
        expect(res.body.auth).to.be.true

        const registeredUser = await UserModel.findOne({ email: testUser.email }) as IUser

        expect(res.body).to.have.property('user')
        expect(res.body.user._id).to.be.equal(registeredUser.id)
    })

    it('should fail due to missing fields (email)', async function () {
        const incompleteUser = { username: 'Test User', password: 'testpassword', confirmPassword: 'testpassword' }

        const res = await agent.post('/v1/users').send(incompleteUser)

        expect(res).to.have.status(400)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Missing email')
    })

    it('should fail due to missing fields (username)', async function () {
        const incompleteUser = { email: 'TestUser@gmail.com', password: 'testpassword', confirmPassword: 'testpassword' }

        const res = await agent.post('/v1/users').send(incompleteUser)

        expect(res).to.have.status(400)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Missing username')
    })

    it('should fail due to missing fields (password)', async function () {
        const incompleteUser = { username: 'Test User', email: 'TestUser@gmail.com', confirmPassword: 'testpassword' }

        const res = await agent.post('/v1/users').send(incompleteUser)

        expect(res).to.have.status(400)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Missing password')
    })

    it('should fail due to missing fields (confirmPassword)', async function () {
        const incompleteUser = { username: 'Test User', email: 'TestUser@gmail.com', password: 'testpassword' }

        const res = await agent.post('/v1/users').send(incompleteUser)

        expect(res).to.have.status(400)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Missing confirmPassword')
    })

    it('should fail due to invalid email', async function () {
        const invalidEmailUser = { ...testUser, email: 'invalid-email' }

        const res = await agent.post('/v1/users').send(invalidEmailUser)

        expect(res).to.have.status(400)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Invalid email format')
    })

    it('should fail due to password mismatch', async function () {
        const passwordMismatchUser = { ...testUser, confirmPassword: 'differentpassword' }

        const res = await agent.post('/v1/users').send(passwordMismatchUser)

        expect(res).to.have.status(400)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Password and Confirm Password does not match')
    })

    it('should fail due to short password', async function () {
        const shortPasswordUser = { ...testUser, password: '123', confirmPassword: '123' }

        const res = await agent.post('/v1/users').send(shortPasswordUser)

        expect(res).to.have.status(400)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Password must be at least 5 characters')
    })

    it('should fail due to email already exists', async function () {
        const user = new UserModel({
            username: testUser.username,
            email: testUser.email,
            password: testUser.password
        })
        user.confirmUser()
        await user.save()

        const res = await agent.post('/v1/users').send(testUser)

        expect(res).to.have.status(400)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Email already exists, please sign in instead')
    })

    it('should fail due to email already exists if user is unconfirmed', async function () {
        const unconfirmedUser = new UserModel({
            username: testUser.username,
            email: testUser.email,
            password: testUser.password
        })
        // We don't call confirmUser
        await unconfirmedUser.save()

        const res = await agent.post('/v1/users').send(testUser)

        expect(res).to.have.status(400)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Email already exists, please sign in instead')
    })
    // TODO: It should not send the registration code in the response
})

describe('User Confirmation Endpoint POST /v1/users/confirm/:userCode', function () {
    let savedUser: IUser
    let confirmationCode: string

    beforeEach(async function () {
        // Create a user before running tests
        const newUser = new UserModel({
            username: 'ToBeConfirmed',
            email: 'ToBeConfirmed@gmail.com',
            password: 'ToBeConfirmedPassword'
        })
        savedUser = await newUser.save()
        confirmationCode = savedUser.confirmationCode!
    })

    it('should confirm a user', async function () {
        const res = await agent.post(`/v1/users/confirm?confirmationCode=${confirmationCode}`).send()
        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('message')
        expect(res.body.message).to.be.equal('Confirmation successful! Your account has been activated.')

        expect(res.body).to.have.property('user')
        expect(res.body.user._id).to.be.equal(savedUser.id)

        const confirmedUser = await UserModel.findById(savedUser._id).exec() as IUser
        expect(confirmedUser.confirmed).to.be.true
    })

    it('should fail if invalid code provided', async function () {
        const res = await agent.post('/v1/users/confirm?confirmationCode=INVALID_CODE').send()
        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('The confirmation code is invalid or the user has already been confirmed')
    })

    it('should fail if no code provided', async function () {
        const res = await agent.post('/v1/users/confirm').send()
        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Confirmation code missing')
    })

    it('should fail if code is empty', async function () {
        const res = await agent.post('/v1/users/confirm?confirmationCode= ').send()
        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Confirmation code missing')
    })

    it('should fail if user already confirmed', async function () {
        await agent.post(`/v1/users/confirm?confirmationCode=${confirmationCode}`).send()
        const res = await agent.post(`/v1/users/confirm?confirmationCode=${confirmationCode}`).send()
        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('The confirmation code is invalid or the user has already been confirmed')
    })

    it('should should delete confirmationCode', async function () {
        await agent.post(`/v1/users/confirm?confirmationCode=${confirmationCode}`).send()
        const confirmedUser = await UserModel.findById(savedUser._id).exec() as IUser
        expect(confirmedUser.confirmationCode).to.be.undefined
    })

    it('should should delete expirationDate', async function () {
        await agent.post(`/v1/users/confirm?confirmationCode=${confirmationCode}`).send()
        const confirmedUser = await UserModel.findById(savedUser._id).exec() as IUser
        expect(confirmedUser.expirationDate).to.be.undefined
    })
})

describe('User Login Endpoint POST /v1/users/login-local', function () {
    let registeredUser: IUser

    beforeEach(async function () {
        // Create a user for login tests
        registeredUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'testpassword'
        })
        registeredUser.confirmUser()
        await registeredUser.save()
    })

    it('should successfully login a user', async function () {
        const loginUser = { email: 'TestUser@gmail.com', password: 'testpassword', stayLoggedIn: true }

        const res = await agent.post('/v1/users/login-local').send(loginUser)

        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('auth')
        expect(res).to.have.cookie('connect.sid') // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true

        expect(res.body).to.have.property('user')
        expect(res.body.user._id).to.be.equal(registeredUser.id)
    })

    it('should successfully login a user even though the user is not confirmed', async function () {
        const unconfirmedUser = new UserModel({
            username: 'UnconfirmedUser',
            email: 'UnconfirmedUser@gmail.com',
            password: 'testpassword'
        })
        await unconfirmedUser.save()

        const unconfirmedUserCreds = { email: 'UnconfirmedUser@gmail.com', password: 'testpassword', stayLoggedIn: true }

        const res = await agent.post('/v1/users/login-local').send(unconfirmedUserCreds)

        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('auth')
        expect(res).to.have.cookie('connect.sid') // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true

        await UserModel.findOneAndDelete({ email: 'UnconfirmedUser@gmail.com' }).exec()
    })

    it('should successfully login a user even though the email is capitalized', async function () {
        const loginUser = { email: 'TESTUSER@gmail.com', password: 'testpassword', stayLoggedIn: true }

        const res = await agent.post('/v1/users/login-local').send(loginUser)

        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('auth')
        expect(res).to.have.cookie('connect.sid') // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true
    })

    it('should successfully login a user with session cookie if stayLoggedIn is false', async function () {
        const loginUser = { email: 'TestUser@gmail.com', password: 'testpassword', stayLoggedIn: false }

        const res = await agent.post('/v1/users/login-local').send(loginUser)

        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('auth')
        expect(res).to.have.cookie('connect.sid') // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true

        // Check the session cookie type (session cookie vs. persistent cookie)
        const cookies = res.headers['set-cookie']
        const sessionCookie = cookies.find((cookie: string) => cookie.startsWith('connect.sid')) as string
        const parsedCookie = parse(sessionCookie)

        // Session cookie should not have a specific expiration time when stayLoggedIn is false
        expect(parsedCookie).to.not.have.property('Expires')
    })

    it('should successfully login a user with session expiration if stayLoggedIn is true', async function () {
        const loginUser = { email: 'TestUser@gmail.com', password: 'testpassword', stayLoggedIn: true }

        const res = await agent.post('/v1/users/login-local').send(loginUser)

        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('auth')
        expect(res).to.have.cookie('connect.sid') // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true

        // Check the expiration of the cookie
        const cookies = res.headers['set-cookie']
        const sessionCookie = cookies.find((cookie: string) => cookie.startsWith('connect.sid')) as string
        const parsedCookie = parse(sessionCookie)
        const expiresDate = new Date(parsedCookie.Expires)

        const expectedExpiryDate = new Date(Date.now() + sessionExpiry)

        expect(expiresDate.getTime()).to.be.closeTo(expectedExpiryDate.getTime(), 5000) // Allowing a 5-second window
    })

    it('should successfully login a user with session cookie if stayLoggedIn is not defined', async function () {
        const loginUser = { email: 'TestUser@gmail.com', password: 'testpassword' }

        const res = await agent.post('/v1/users/login-local').send(loginUser)

        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('auth')
        expect(res).to.have.cookie('connect.sid') // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true

        // Check the session cookie type (session cookie vs. persistent cookie)
        const cookies = res.headers['set-cookie']
        const sessionCookie = cookies.find((cookie: string) => cookie.startsWith('connect.sid')) as string
        const parsedCookie = parse(sessionCookie)

        // Session cookie should not have a specific expiration time when stayLoggedIn is false
        expect(parsedCookie).to.not.have.property('Expires')
    })

    it('should fail due to missing email', async function () {
        const incompleteUser = { password: 'testpassword', stayLoggedIn: true }

        const res = await agent.post('/v1/users/login-local').send(incompleteUser)

        expect(res).to.have.status(401)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Missing credentials')
    })

    it('should fail due to missing password', async function () {
        const incompleteUser = { email: 'TestUser@gmail.com', stayLoggedIn: true }

        const res = await agent.post('/v1/users/login-local').send(incompleteUser)

        expect(res).to.have.status(401)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Missing credentials')
    })

    it('should fail due to missing email and password', async function () {
        const incompleteUser = { stayLoggedIn: true }

        const res = await agent.post('/v1/users/login-local').send(incompleteUser)

        expect(res).to.have.status(401)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Missing credentials')
    })

    it('should fail due to invalid email format', async function () {
        const invalidEmailUser = { email: 'invalid-email', password: 'testpassword', stayLoggedIn: true }

        const res = await agent.post('/v1/users/login-local').send(invalidEmailUser)

        expect(res).to.have.status(401)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Invalid email format')
    })

    it('should fail due to user not found', async function () {
        const notFoundUser = { email: 'NotFound@gmail.com', password: 'testpassword', stayLoggedIn: true }

        const res = await agent.post('/v1/users/login-local').send(notFoundUser)

        expect(res).to.have.status(401)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('A user with the email NotFound@gmail.com was not found. Please check spelling or sign up')
    })

    it('should fail due to invalid credentials', async function () {
        const invalidCreds = { email: 'TestUser@gmail.com', password: 'wrongpassword', stayLoggedIn: true }

        const res = await agent.post('/v1/users/login-local').send(invalidCreds)

        expect(res).to.have.status(401)
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Invalid credentials')
    })
})

describe('User Logout Endpoint DELETE /v1/users/logout', function () {
    let registeredUser

    beforeEach(async function () {
        registeredUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'testpassword'
        })
        registeredUser.confirmUser()
        await registeredUser.save()

        await agent.post('/v1/users/login-local').send({
            email: 'TestUser@gmail.com',
            password: 'testpassword',
            stayLoggedIn: true
        })
    })

    afterEach(async function () {
        agent.close() // Close the agent after tests
    })

    it('should successfully log out a user', async function () {
        const res = await agent.delete('/v1/users/logout')

        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('message')
        expect(res.body.message).to.be.equal('Logged out successfully')

        // Check that the session cookie has been cleared or invalidated.
        expect(res).to.not.have.cookie('connect.sid')

        // Test that the session is indeed invalidated:
        const protectedRes = await agent.get('/v1/users/events')
        expect(protectedRes).to.have.status(401)
    })

    it('should not allow logout without logging in', async function () {
        // Using a new agent that hasn't logged in:
        const newAgent = chai.request.agent(server.app)
        const res = await newAgent.delete('/v1/users/logout')

        expect(res).to.have.status(401)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('message')
        expect(res.body.message).to.be.equal('Unauthorized')

        newAgent.close()
    })

    it('should not allow logout with an invalid session cookie', async function () {
        // Manipulating the session cookie (token) for the already logged-in user:
        const newAgent = chai.request.agent(server.app)
        newAgent.jar.setCookie('connect.sid=invalidSessionTokenHere', `localhost:${expressPort}`)

        const res = await newAgent.delete('/v1/users/logout')

        expect(res).to.have.status(401)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('message')
        expect(res.body.message).to.be.equal('Unauthorized')

        newAgent.close()
    })
})

describe('Get User Events Endpoint GET /v1/users/events', function () {
    let testUser: IUser
    let testEvent: IEvent

    beforeEach(async function () {
        testUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'testpassword'
        })
        testUser.confirmUser()
        await testUser.save()

        testEvent = new EventModel({
            eventName: 'TestEvent',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await testEvent.save()

        await UserModel.findByIdAndUpdate(testUser._id, { $push: { events: testEvent._id } }).exec()
        await EventModel.findByIdAndUpdate(testEvent._id, { $push: { participants: testUser._id } }).exec()

        const user = { email: testUser.email, password: 'testpassword', stayLoggedIn: true }

        // Log the user in to get a token
        await agent.post('/v1/users/login-local').send(user)
    })

    it('should fetch user events successfully', async function () {
        const res = await agent.get('/v1/users/events')

        expect(res).to.have.status(200)
        expect(res.body).to.be.a('array')
        expect(res.body[0]).to.have.property('eventName')
        expect(res.body[0]).to.have.property('startDate')
        expect(res.body[0]).to.have.property('endDate')
        expect(res.body[0]).to.have.property('participants')
        expect(res.body[0].eventName).to.be.equal('TestEvent')
        expect(res.body[0].participants[0]).to.be.equal(testUser.id)
    })

    it('should fail due to lack of authentication', async function () {
        const newAgent = chai.request.agent(server.app)
        const res = await newAgent.get('/v1/users/events')

        expect(res).to.have.status(401)
        expect(res.body.message).to.be.equal('Unauthorized')

        newAgent.close()
    })
})

describe('Generate New User Code Endpoint PUT /v1/users/new-code', function () {
    let testUser: IUser

    beforeEach(async function () {
        // Create a test user
        testUser = new UserModel({
            username: 'CodeTestUser',
            email: 'CodeTestUser@gmail.com',
            password: 'TestPasswordForCode'
        })
        testUser.confirmUser()
        await testUser.save()

        await agent.post('/v1/users/login-local').send({
            email: 'CodeTestUser@gmail.com',
            password: 'TestPasswordForCode'
        })
    })

    it('should generate a new user code successfully', async function () {
        const userCodeBefore = testUser.userCode

        const res = await agent.post('/v1/users/new-code')

        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')

        expect(res.body).to.have.property('user')
        expect(res.body.user._id).to.be.equal(testUser.id)

        // Fetch the user from the database to verify userCode
        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser
        expect(updatedTestUser.userCode).to.equal(res.body.user.userCode)
        expect(updatedTestUser.userCode).to.not.equal(userCodeBefore)
    })
})

describe('Follow User Endpoint PUT /v1/users/following/:userId', function () {
    let userA: IUser, userB: IUser

    beforeEach(async function () {
        // Create two test users
        userA = new UserModel({
            username: 'UserA',
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
        userA.confirmUser()
        await userA.save()

        userB = new UserModel({
            username: 'UserB',
            email: 'userB@gmail.com',
            password: 'passwordB'
        })
        userB.confirmUser()
        await userB.save()

        // Login as userA
        await agent.post('/v1/users/login-local').send({
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
    })

    it('should allow userA to follow userB', async function () {
        const res = await agent.put(`/v1/users/following/${userB._id}`)

        expect(res).to.have.status(200)

        // Fetch both users from the database
        const updatedUserA = await UserModel.findById(userA._id).exec() as IUser
        const updatedUserB = await UserModel.findById(userB._id).exec() as IUser

        // Check that userA's following array contains userB's ID
        expect(updatedUserA.following).to.include(userB._id)

        // Check that userB's followers array contains userA's ID
        expect(updatedUserB.followers).to.include(userA._id)

        expect(res.body).to.have.property('user')
        expect(res.body.user._id).to.be.equal(userA.id)
    })

    it('should not allow following if user is not authenticated', async function () {
        const newAgent = chai.request.agent(server.app) // New agent without logging in
        const res = await newAgent.put(`/v1/users/following/${userB._id}`)

        expect(res).to.have.status(401)
        expect(res.body.message).to.be.equal('Unauthorized')

        newAgent.close()
    })

    it('should not allow following a non-existent user', async function () {
        const invalidUserId = '5f5f5f5f5f5f5f5f5f5f5f5f' // An example of a non-existent ObjectId
        const res = await agent.put(`/v1/users/following/${invalidUserId}`)

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('The user to be followed could not be found')
    })

    it('should not allow a user to follow themselves', async function () {
        const res = await agent.put(`/v1/users/following/${userA._id}`)

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('User cannot follow themselves')
    })

    it('should handle when a user tries to follow another user they are already following', async function () {
        // First, let's make userA follow userB
        await agent.put(`/v1/users/following/${userB._id}`)

        // Now, try to follow again
        const res = await agent.put(`/v1/users/following/${userB._id}`)

        expect(res).to.have.status(200) // Success
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('message')
        expect(res.body.message).to.be.equal('User is already followed') // Custom message
    })

    it('should not update UserA if UserB is not found', async function () {
        // Delete user B
        await UserModel.findOneAndDelete({ email: 'userB@gmail.com' }).exec()

        // Try to make userA follow userB, which should fail
        const res = await agent.put(`/v1/users/following/${userB._id}`)

        expect(res).to.have.status(400) // Expect validation error

        // Check that userA's following array does NOT contain userB's ID
        const updatedUserA = await UserModel.findById(userA._id).exec() as IUser
        expect(updatedUserA.following).to.not.include(userB._id)
    })
})

describe('Unfollow User Endpoint PUT /v1/users/unfollow/:userId', function () {
    let userA: IUser, userB: IUser

    beforeEach(async function () {
        // Create two test users
        userA = new UserModel({
            username: 'UserA',
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
        userA.confirmUser()
        const savedUserA = await userA.save()

        userB = new UserModel({
            username: 'UserB',
            email: 'userB@gmail.com',
            password: 'passwordB'
        })
        userB.confirmUser()
        const savedUserB = await userB.save()

        // UserA follows UserB
        await Promise.all([
            UserModel.findByIdAndUpdate(savedUserA._id, { $push: { following: { $each: [savedUserB.id] } } }).exec(),
            UserModel.findByIdAndUpdate(savedUserB.id, { $push: { followers: { $each: [savedUserA.id] } } }).exec()
        ])

        // Login as userA
        await agent.post('/v1/users/login-local').send({
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
    })

    it('should allow userA to unfollow userB', async function () {
        const res = await agent.delete(`/v1/users/unfollow/${userB.id}`)
        expect(res).to.have.status(200)

        const updatedUserA = await UserModel.findById(userA._id).exec() as IUser
        const updatedUserB = await UserModel.findById(userB._id).exec() as IUser

        expect(updatedUserA.following.map(id => id)).to.not.include(userB.id)
        expect(updatedUserB.following.map(id => id)).to.not.include(userA.id)
    })

    it('should not allow unfollowing if user is not authenticated', async function () {
        const newAgent = chai.request.agent(server.app)
        const res = await newAgent.delete(`/v1/users/unfollow/${userB.id}`)

        expect(res).to.have.status(401)
        expect(res.body.message).to.be.equal('Unauthorized')

        newAgent.close()
    })

    it('should not allow unfollowing a non-existent user', async function () {
        const invalidUserId = '5f5f5f5f5f5f5f5f5f5f5f5f'
        const res = await agent.delete(`/v1/users/unfollow/${invalidUserId}`)

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('The user to be un-followed could not be found')
    })

    it('should not allow a user to unfollow themselves', async function () {
        const res = await agent.delete(`/v1/users/unfollow/${userA.id}`)

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('User cannot un-follow themselves')
    })

    it('should handle when a user tries to unfollow another user they are not following', async function () {
        // Introduce a new user
        const userC = new UserModel({
            username: 'UserC',
            email: 'userC@gmail.com',
            password: 'passwordC'
        })
        userC.confirmUser()
        await userC.save()

        const newAgent = chai.request.agent(server.app)
        await newAgent.post('/v1/users/login-local').send({
            email: 'userC@gmail.com',
            password: 'passwordC'
        })

        const res = await newAgent.delete(`/v1/users/unfollow/${userB.id}`)

        expect(res).to.have.status(400) // Error (This status and the message below is a suggestion)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('User is not followed')

        newAgent.close()
    })
})

describe('Update Password Endpoint PATCH /update-password', function () {
    let testUser: IUser

    beforeEach(async function () {
        // Create a test user
        testUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'TestPassword'
        })
        testUser.confirmUser()
        await testUser.save()

        await agent.post('/v1/users/login-local').send({
            email: 'TestUser@gmail.com',
            password: 'TestPassword'
        })
    })

    it('should update TestUser password successfully', async function () {
        const updatedDetails = {
            newPassword: 'UpdatedPassword',
            confirmNewPassword: 'UpdatedPassword',
            currentPassword: 'TestPassword'
        }
        const res = await agent.patch('/v1/users/update-password').send(updatedDetails)

        expect(res).to.have.status(200)

        // Fetch the updated user from the database
        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser

        const passwordsMatch = await compare('UpdatedPassword', updatedTestUser.password)
        expect(passwordsMatch).to.be.true

        expect(updatedTestUser.confirmed).to.be.true
        expect(updatedTestUser.toObject()).to.not.have.property('expirationDate')

        // Ensure password is hashed and not the plain-text password
        expect(updatedTestUser.password).to.not.equal('UpdatedPassword')
    })

    it('should not allow updating without authentication', async function () {
        const newAgent = chai.request.agent(server.app)
        const res = await newAgent.patch('/v1/users/update-password').send({ newUsername: 'newTestUser' })

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser

        expect(updatedTestUser.confirmed).to.be.true
        expect(updatedTestUser.toObject()).to.not.have.property('expirationDate')

        expect(res).to.have.status(401)
        expect(res.body.message).to.be.equal('Unauthorized')

        newAgent.close()
    })

    it('should handle invalid or malformed data', async function () {
        const res = await agent.patch('/v1/users/update-password').send({ newUsername: '' }) // Empty username

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser

        expect(updatedTestUser.confirmed).to.be.true
        expect(updatedTestUser.toObject()).to.not.have.property('expirationDate')

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Missing confirmNewPassword, currentPassword, newPassword')
    })

    it('should not allow password update with incorrect current password', async function () {
        const incorrectCurrentPasswordDetails = {
            newPassword: 'UpdatedPassword2',
            confirmNewPassword: 'UpdatedPassword2',
            currentPassword: 'WrongCurrentPassword'
        }
        const res = await agent.patch('/v1/users/update-password').send(incorrectCurrentPasswordDetails)

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('currentPassword does not match with user password')
    })

    it('should not allow password update with mismatching password and confirm password', async function () {
        const mismatchingPasswords = {
            newPassword: 'UpdatedPassword2',
            confirmNewPassword: 'WrongConfirmPassword',
            currentPassword: 'TestPassword'
        }
        const res = await agent.patch('/v1/users/update-password').send(mismatchingPasswords)

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('newPassword and confirmNewPassword does not match')
    })

    it('should return an error if not all fields are provided', async function () {
        const partialPasswordDetails = {
            newPassword: 'PartialUpdatePassword',
            confirmNewPassword: 'PartialUpdatePassword'
        }
        const res = await agent.patch('/v1/users/update-password').send(partialPasswordDetails)
        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Missing currentPassword')
    })
})

describe('Reset Password Endpoint PATCH /reset-password', function () {
    let testUser: IUser

    beforeEach(async function () {
        // Create a test user
        testUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'TestPassword',
            passwordResetCode: 'sampleResetCode12345'
        })
        testUser.confirmUser()
        await testUser.save()
    })

    it('should reset the password successfully', async function () {
        const resetDetails = {
            newPassword: 'NewPassword123',
            confirmNewPassword: 'NewPassword123'
        }
        const res = await agent.patch('/v1/users/reset-password/TestUser@gmail.com/sampleResetCode12345').send(resetDetails)

        expect(res).to.have.status(201)

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser
        const passwordsMatch = await compare('NewPassword123', updatedTestUser.password)

        expect(passwordsMatch).to.be.true
    })

    it('should not update the reset password code passwords do not match', async function () {
        const mismatchingPasswords = {
            newPassword: 'NewPassword123',
            confirmNewPassword: 'WrongPassword123'
        }
        const res = await agent.patch('/v1/users/reset-password/TestUser@gmail.com/sampleResetCode12345').send(mismatchingPasswords)

        expect(res).to.have.status(400)

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser
        expect(updatedTestUser.passwordResetCode).to.be.equal('sampleResetCode12345')
    })

    it('should return an error if newPassword and confirmNewPassword do not match', async function () {
        const mismatchingPasswords = {
            newPassword: 'NewPassword123',
            confirmNewPassword: 'WrongPassword123'
        }
        const res = await agent.patch('/v1/users/reset-password/TestUser@gmail.com/sampleResetCode12345').send(mismatchingPasswords)

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('newPassword and confirmNewPassword does not match')
    })

    it('should return an error if passwordResetCode is invalid', async function () {
        const resetDetails = {
            newPassword: 'NewPassword123',
            confirmNewPassword: 'NewPassword123'
        }

        const res = await agent.patch('/v1/users/reset-password/TestUser@gmail.com/InvalidResetCode').send(resetDetails)

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('The password reset code is not correct')
    })

    it('should return an error if not all fields are provided', async function () {
        const partialPasswordDetails = {
            newPassword: 'PartialPassword'
        }

        const res = await agent.patch('/v1/users/reset-password/TestUser@gmail.com/sampleResetCode12345').send(partialPasswordDetails) // Missing confirmNewPassword

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')

        expect(res.body.error).to.be.equal('Missing confirmNewPassword')
    })

    it('should not store the password unhashed', async function () {
        const resetDetails = {
            newPassword: 'NewPassword123',
            confirmNewPassword: 'NewPassword123'
        }
        await agent.patch('/v1/users/reset-password/TestUser@gmail.com/sampleResetCode12345').send(resetDetails)

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser

        const passwordIsHashed = (updatedTestUser.password !== resetDetails.newPassword)

        expect(passwordIsHashed).to.be.true
    })

    it('should not reset the password if passwordResetCode is incorrect', async function () {
        const resetDetails = {
            newPassword: 'NewPassword123',
            confirmNewPassword: 'NewPassword123'
        }
        await agent.patch('/v1/users/reset-password/TestUser@gmail.com/InvalidResetCode').send(resetDetails)

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser
        const passwordsMatch = await compare('NewPassword123', updatedTestUser.password)
        expect(passwordsMatch).to.be.false
    })

    it('should remove the passwordResetCode', async function () {
        const resetDetails = {
            newPassword: 'NewPassword123',
            confirmNewPassword: 'NewPassword123'
        }
        await agent.patch('/v1/users/reset-password/TestUser@gmail.com/sampleResetCode12345').send(resetDetails)

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser

        expect(updatedTestUser.passwordResetCode).to.be.undefined
    })
})

describe('Update Username Endpoint PATCH /update-username', function () {
    let testUser: IUser

    beforeEach(async function () {
        // Create a test user
        testUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'TestPassword'
        })
        testUser.confirmUser()
        await testUser.save()

        await agent.post('/v1/users/login-local').send({
            email: 'TestUser@gmail.com',
            password: 'TestPassword'
        })
    })

    it('should update TestUser username successfully', async function () {
        const updatedDetails = {
            newUsername: 'UpdatedTestUser'
        }
        const res = await agent.patch('/v1/users/update-username').send(updatedDetails)

        expect(res).to.have.status(200)

        // Fetch the updated user from the database
        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser

        expect(updatedTestUser.username).to.equal('UpdatedTestUser')

        expect(updatedTestUser.confirmed).to.be.true
        expect(updatedTestUser.toObject()).to.not.have.property('expirationDate')
    })

    it('should not allow updating without authentication', async function () {
        const newAgent = chai.request.agent(server.app)
        const res = await newAgent.patch('/v1/users/update-username').send({ newUsername: 'newTestUser' })

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser

        expect(updatedTestUser.confirmed).to.be.true
        expect(updatedTestUser.toObject()).to.not.have.property('expirationDate')

        expect(res).to.have.status(401)
        expect(res.body.message).to.be.equal('Unauthorized')

        newAgent.close()
    })

    it('should handle invalid or malformed data', async function () {
        const res = await agent.patch('/v1/users/update-username').send({ newUsername: '' }) // Empty username

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser
        expect(updatedTestUser.confirmed).to.be.true
        expect(updatedTestUser.toObject()).to.not.have.property('expirationDate')

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Missing newUsername')
    })
})

describe('Get Followers Endpoint GET /v1/users/followers', function () {
    let userA: IUser, userB: IUser, userC: IUser

    beforeEach(async function () {
        // Create three test users: A, B, and C
        userA = new UserModel({
            username: 'UserA',
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
        userA.confirmUser()
        await userA.save()

        userB = new UserModel({
            username: 'UserB',
            email: 'userB@gmail.com',
            password: 'passwordB'
        })
        userB.confirmUser()
        await userB.save()

        userC = new UserModel({
            username: 'UserC',
            email: 'userC@gmail.com',
            password: 'passwordC'
        })
        userC.confirmUser()
        await userC.save()

        // Make userB and userC follow userA
        await Promise.all([
            // UserB follows userA
            UserModel.findByIdAndUpdate(userB._id, { $push: { following: { $each: [userA._id] } } }).exec(),
            UserModel.findByIdAndUpdate(userA._id, { $push: { followers: { $each: [userB._id] } } }).exec(),

            // UserC follows userA
            UserModel.findByIdAndUpdate(userC._id, { $push: { following: { $each: [userA._id] } } }).exec(),
            UserModel.findByIdAndUpdate(userA._id, { $push: { followers: { $each: [userC._id] } } }).exec()
        ])

        // Login as userA
        await agent.post('/v1/users/login-local').send({
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
    })

    it('should successfully get the followers of userA', async function () {
        const res = await agent.get('/v1/users/followers')

        expect(res).to.have.status(200)
        expect(res.body).to.be.an('array')
        expect(res.body.length).to.be.equal(2)
        expect(res.body).to.include.members(['UserB', 'UserC'])
    })

    it('should return an empty array if the user has no followers', async function () {
        const newAgent = chai.request.agent(server.app)

        await newAgent.post('/v1/users/login-local').send({
            email: 'userC@gmail.com',
            password: 'passwordC'
        })

        const res = await newAgent.get('/v1/users/followers')

        expect(res).to.have.status(200)
        expect(res.body).to.be.an('array')
        expect(res.body.length).to.be.equal(0)
    })
})

describe('Get Following Endpoint GET /v1/users/following', function () {
    let userA: IUser, userB: IUser, userC: IUser

    beforeEach(async function () {
        // Create three test users: A, B, and C
        userA = new UserModel({
            username: 'UserA',
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
        userA.confirmUser()
        await userA.save()

        userB = new UserModel({
            username: 'UserB',
            email: 'userB@gmail.com',
            password: 'passwordB'
        })
        userB.confirmUser()
        await userB.save()

        userC = new UserModel({
            username: 'UserC',
            email: 'userC@gmail.com',
            password: 'passwordC'
        })
        userC.confirmUser()
        await userC.save()

        // Make userA follow userB and userC
        await Promise.all([
            // UserA follows userB
            UserModel.findByIdAndUpdate(userA._id, { $push: { following: { $each: [userB._id] } } }).exec(),
            UserModel.findByIdAndUpdate(userB._id, { $push: { followers: { $each: [userA._id] } } }).exec(),

            // UserA follows userC
            UserModel.findByIdAndUpdate(userA._id, { $push: { following: { $each: [userC._id] } } }).exec(),
            UserModel.findByIdAndUpdate(userC._id, { $push: { followers: { $each: [userA._id] } } }).exec()
        ])

        // Login as userA
        await agent.post('/v1/users/login-local').send({
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
    })

    it('should successfully get the users that userA is following', async function () {
        const res = await agent.get('/v1/users/following')

        expect(res).to.have.status(200)
        expect(res.body).to.be.an('array')
        expect(res.body.length).to.be.equal(2)
        expect(res.body).to.include.members(['UserB', 'UserC'])
    })

    it('should return an empty array if the user is not following anyone', async function () {
        const newAgent = chai.request.agent(server.app)

        await newAgent.post('/v1/users/login-local').send({
            email: 'userC@gmail.com',
            password: 'passwordC'
        })

        const res = await newAgent.get('/v1/users/following')

        expect(res).to.have.status(200)
        expect(res.body).to.be.an('array')
        expect(res.body.length).to.be.equal(0)
    })
})

describe('Get Common Events Endpoint GET /v1/users/:userId/common-events', function () {
    let userA: IUser, userB: IUser, userC: IUser
    let event1: IEvent, event2: IEvent, event3: IEvent

    beforeEach(async function () {
        // Create two test users: A and B
        userA = new UserModel({
            username: 'UserA',
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
        userA.confirmUser()
        await userA.save()

        userB = new UserModel({
            username: 'UserB',
            email: 'userB@gmail.com',
            password: 'passwordB'
        })
        userB.confirmUser()
        await userB.save()

        userC = new UserModel({
            username: 'UserC',
            email: 'userC@gmail.com',
            password: 'passwordC'
        })
        userC.confirmUser()
        await userC.save()

        // Create three test events
        event1 = new EventModel({
            eventName: 'Event 1',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await event1.save()

        event2 = new EventModel({
            eventName: 'Event 2',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await event2.save()

        event3 = new EventModel({
            eventName: 'Event 3',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await event3.save()

        // Assign events to users
        await Promise.all([
            // UserA attends Event 1 and Event 2
            UserModel.findByIdAndUpdate(userA._id, { $push: { events: { $each: [event1._id] } } }).exec(),
            UserModel.findByIdAndUpdate(userA._id, { $push: { events: { $each: [event2._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event1._id, { $push: { participants: { $each: [userA._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event2._id, { $push: { participants: { $each: [userA._id] } } }).exec(),

            // UserB attends Event 2 and Event 3
            UserModel.findByIdAndUpdate(userB._id, { $push: { events: { $each: [event2._id] } } }).exec(),
            UserModel.findByIdAndUpdate(userB._id, { $push: { events: { $each: [event3._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event2._id, { $push: { participants: { $each: [userB._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event3._id, { $push: { participants: { $each: [userB._id] } } }).exec()
        ])

        // Login as userA
        await agent.post('/v1/users/login-local').send({
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
    })

    it('should successfully get the common events between userA and userB', async function () {
        const res = await agent.get(`/v1/users/${userB._id}/common-events`)

        expect(res).to.have.status(200)
        expect(res.body).to.be.an('array')
        expect(res.body.length).to.be.equal(1)
        expect(res.body[0]).to.be.equal(event2._id.toString())
    })

    it('should return an empty array for common events between userA and userC', async function () {
        const res = await agent.get(`/v1/users/${userC._id}/common-events`)

        expect(res).to.have.status(200)
        expect(res.body).to.be.an('array')
        expect(res.body.length).to.be.equal(0)
    })

    it('should return a 400 error if the candidate user is not found', async function () {
        // const nonExistentUserId = new mongoose.Types.ObjectId()
        const nonExistentUserId = '121212121212121212121212'
        const res = await agent.get(`/v1/users/${nonExistentUserId}/common-events`)

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.equal('The user to be found events in common with could not be found')
    })

    it('should return a 400 error if the userId is invalid', async function () {
        const invalidUserId = 'invalidId'
        const res = await agent.get(`/v1/users/${invalidUserId}/common-events`)

        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.equal('Invalid user ID format')
    })
})

describe('Delete User Endpoint DELETE /v1/users/', function () {
    let userA: IUser, userB: IUser
    let event1: IEvent, event2: IEvent

    beforeEach(async function () {
        // Create two test users: A and B
        userA = new UserModel({
            username: 'UserA',
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
        userA.confirmUser()
        await userA.save()

        userB = new UserModel({
            username: 'UserB',
            email: 'userB@gmail.com',
            password: 'passwordB'
        })
        userB.confirmUser()
        await userB.save()

        // Create three test events
        event1 = new EventModel({
            eventName: 'Event 1',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await event1.save()

        event2 = new EventModel({
            eventName: 'Event 2',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02')
        })
        await event2.save()

        // Assign events to users
        await Promise.all([
            // UserA and UserB attends Event 1
            UserModel.findByIdAndUpdate(userA._id, { $push: { events: { $each: [event1._id] } } }).exec(),
            UserModel.findByIdAndUpdate(userB._id, { $push: { events: { $each: [event1._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event1._id, { $push: { participants: { $each: [userA._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event1._id, { $push: { participants: { $each: [userB._id] } } }).exec(),

            // UserA attends Event 2
            UserModel.findByIdAndUpdate(userA._id, { $push: { events: { $each: [event2._id] } } }).exec(),
            EventModel.findByIdAndUpdate(event2._id, { $push: { participants: { $each: [userA._id] } } }).exec()
        ])

        // Login as userA
        await agent.post('/v1/users/login-local').send({
            email: 'userA@gmail.com',
            password: 'passwordA'
        })
    })

    it('should successfully delete the user', async function () {
        const res = await agent.delete('/v1/users/')

        expect(res).to.have.status(200)
        expect(res.body).to.have.property('user')
        expect(res.body.user._id).to.be.equal(userA.id)

        const deletedUser = await UserModel.findById(userA._id).exec() as IUser | null

        expect(deletedUser).to.be.null
    })

    it('should remove the user from their attended event', async function () {
        await agent.delete('/v1/users/')

        const updatedEvent1 = await EventModel.findById(event1._id).exec() as IEvent

        // Validate that userA is no longer part of the event
        expect(updatedEvent1.participants).to.not.include(userA._id)
    })

    it('should not remove non-empty event', async function () {
        await agent.delete('/v1/users/')

        const updatedEvent1 = await EventModel.findById(event1._id).exec() as IEvent

        expect(updatedEvent1).to.not.be.null
    })

    it('should not delete the not empty event after deletion', async function () {
        await agent.delete('/v1/users/')

        const notDeletedEvent = await EventModel.findById(event1._id).exec() as IEvent | null

        expect(notDeletedEvent).to.not.be.null
    })

    it('should be removed from the followings followers array after deletion', async function () {
        // userA follows userB
        await Promise.all([
            UserModel.findByIdAndUpdate(userA._id, { $push: { following: { $each: [userB.id] } } }).exec(),
            UserModel.findByIdAndUpdate(userB.id, { $push: { followers: { $each: [userA.id] } } }).exec()
        ])

        await agent.delete('/v1/users/')

        const updatedUserB = await UserModel.findById(userB._id).exec() as IUser

        expect(updatedUserB.followers).to.not.include(userA._id)
    })

    it('should be removed from the followers following array after deletion', async function () {
        // userB follows userA
        await Promise.all([
            UserModel.findByIdAndUpdate(userB._id, { $push: { following: { $each: [userA.id] } } }).exec(),
            UserModel.findByIdAndUpdate(userA.id, { $push: { followers: { $each: [userB.id] } } }).exec()
        ])

        await agent.delete('/v1/users/')

        const updatedUserB = await UserModel.findById(userB._id).exec() as IUser

        expect(updatedUserB.following).to.not.include(userA._id)
    })

    it('should be removed from the followers following array after deletion', async function () {
        // userB follows userA
        await Promise.all([
            UserModel.findByIdAndUpdate(userB._id, { $push: { following: { $each: [userA.id] } } }).exec(),
            UserModel.findByIdAndUpdate(userA.id, { $push: { followers: { $each: [userB.id] } } }).exec()
        ])

        await agent.delete('/v1/users/')

        const updatedUserB = await UserModel.findById(userB._id).exec() as IUser

        expect(updatedUserB.following).to.not.include(userA._id)
    })

    it('should remove the users availabilities', async function () {
        // TODO:
    })
})
