// Node.js built-in modules
import config from 'config'

// Third-party libraries
import dotenv from 'dotenv'
import chai from 'chai'
import chaiHttp from 'chai-http'
import { parse } from 'cookie';

// Own modules
import logger from '../utils/logger.js'
import UserModel, { type IUser } from '../models/User.js'
import EventModel, { type IEvent } from '../models/Event.js'
import error from '../utils/errors.js'
import { AppType, ShutDownType } from '../server.js'
import { test } from 'mocha';

dotenv.config()

chai.use(chaiHttp)
const { expect } = chai

const sessionExpiry = Number(config.get('session.expiry'))
const sessionPersistentExpiry = Number(config.get('session.persistentExpiry'))
const server = await import('../server.js')
const expressPort = config.get('ports.express')


after(async function () {
    this.timeout(10000) // Set the timeout to 10 seconds.
    await server.shutDown()
})

describe('User Registration Endpoint POST /api/v1/users', function() {    
    let testUser = { username: 'Test User', email: 'testuser@gmail.com', password: 'testpassword', confirmPassword: 'testpassword' };
    let agent: ChaiHttp.Agent;

    beforeEach(async function() {
        agent = chai.request.agent(server.app);  // Create an agent instance
    })
    
    afterEach(async function() {
        // Remove test user if exists before running tests
        await UserModel.findOneAndDelete({email: 'TestUser@gmail.com'}).exec()
        agent.close();
    });

    it('should successfully register a new user', async function () {     
        const res = await agent.post('/api/v1/users').send(testUser);
        
        expect(res).to.have.status(201);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.equal('Registration successful! Please check your email to confirm your account within 24 hours or your account will be deleted.');
    });

    it('should fail due to missing fields (email)', async function () {
        const incompleteUser = { username: 'Test User', password: 'testpassword', confirmPassword: 'testpassword' };
        
        const res = await agent.post('/api/v1/users').send(incompleteUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for missing fields
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Username, Email, Password and/or Confirm Password');
    });

    it('should fail due to missing fields (username)', async function () {
        const incompleteUser = { email: 'TestUser@gmail.com', password: 'testpassword', confirmPassword: 'testpassword' };
        
        const res = await agent.post('/api/v1/users').send(incompleteUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for missing fields
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Username, Email, Password and/or Confirm Password');
    });

    it('should fail due to missing fields (password)', async function () {
        const incompleteUser = { username: 'Test User', email: 'TestUser@gmail.com', confirmPassword: 'testpassword' };
        
        const res = await agent.post('/api/v1/users').send(incompleteUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for missing fields'
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Username, Email, Password and/or Confirm Password');
    });

    it('should fail due to missing fields (confirmPassword)', async function () {
        const incompleteUser = { username: 'Test User', email: 'TestUser@gmail.com', password: 'testpassword' };
        
        const res = await agent.post('/api/v1/users').send(incompleteUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for missing fields
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Username, Email, Password and/or Confirm Password');
    });

    it('should fail due to invalid email', async function () {
        const invalidEmailUser = { ...testUser, email: 'invalid-email' };
        
        const res = await agent.post('/api/v1/users').send(invalidEmailUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for invalid email
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Invalid email format');
    });

    it('should fail due to password mismatch', async function () {
        const passwordMismatchUser = { ...testUser, confirmPassword: 'differentpassword' };
        
        const res = await agent.post('/api/v1/users').send(passwordMismatchUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for password mismatch
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal("Password and Confirm Password doesn't match");
    });

    it('should fail due to short password', async function () {
        const shortPasswordUser = { ...testUser, password: '123', confirmPassword: '123' };
        
        const res = await agent.post('/api/v1/users').send(shortPasswordUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for short password
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Password must be at least 5 characters');
    });

    it('should fail due to email already exists', async function () {
        const user = new UserModel({ 
            username: testUser.username, 
            email: testUser.email, 
            password: testUser.password         
        });
        user.confirmUser()
        await user.save();

        const res = await agent.post('/api/v1/users').send(testUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for email already exists
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Email already exists, please sign in instead');
    });

    it('should fail due to email exists but not confirmed', async function () {
        const unconfirmedUser = new UserModel({
            username: testUser.username, 
            email: testUser.email, 
            password: testUser.password 
         });
        // We don't call confirmUser
        await unconfirmedUser.save();

        const res = await agent.post('/api/v1/users').send( testUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for email exists but not confirmed
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Email already exists but is not confirmed. Please follow the link sent to your email inbox');
    });
});

describe('User Confirmation Endpoint POST /api/v1/users/confirm/:userCode', function() {
    let savedUser: IUser
    let userCode: string
    let agent: ChaiHttp.Agent
    
    beforeEach(async function() {
        // Create a user before running tests
        const newUser = new UserModel({
            username: 'ToBeConfirmed',
            email: 'ToBeConfirmed@gmail.com',
            password: 'ToBeConfirmedPassword',
        });
        savedUser = await newUser.save();
        userCode = savedUser.userCode;

        agent = chai.request.agent(server.app);  // Create an agent instance
    });

    afterEach(async function() {
        // Remove test user if exists before running tests
        await UserModel.findOneAndDelete({email: 'ToBeConfirmed@gmail.com'}).exec()
        agent.close();
    });

    it('should confirm a user', async function () {
        const res = await agent.post(`/api/v1/users/confirm/${userCode}`).send();
        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('message')
        expect(res.body.message).to.be.equal('Confirmation successful! Your account has been activated.');
        
        const confirmedUser = await UserModel.findOne({userCode}).exec() as IUser
        expect(confirmedUser.confirmed).to.be.true
    });

    it('should fail if invalid code provided', async function () {
        const res = await agent.post(`/api/v1/users/confirm/INVALID_CODE`).send()
        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Invalid confirmation code')
    });

    it('should fail if user already confirmed', async function () {
        await agent.post(`/api/v1/users/confirm/${userCode}`).send()
        const res = await agent.post(`/api/v1/users/confirm/${userCode}`).send()
        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('User has already been confirmed')
    });
});

describe('User Login Endpoint POST /api/v1/users/login-local', function() {
    let registeredUser;
    let agent: ChaiHttp.Agent

    beforeEach(async function() {
        // Create a user for login tests
        registeredUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'testpassword',
        });
        registeredUser.confirmUser()
        await registeredUser.save()

        agent = chai.request.agent(server.app);  // Create an agent instance
    });

    afterEach(async function() {
        // Cleanup: remove test user
        await UserModel.findOneAndDelete({email: 'TestUser@gmail.com'}).exec();
        agent.close();
    });

    it('should successfully login a user', async function () {
        const loginUser = { email: 'TestUser@gmail.com', password: 'testpassword', stayLoggedIn: true };
    
        const res = await agent.post('/api/v1/users/login-local').send(loginUser);
    
        expect(res).to.have.status(200);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('auth');
        expect(res).to.have.cookie('connect.sid'); // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true;
    });    

    it('should successfully login a user even though the user is not confirmed', async function () {
        const unconfirmedUser = new UserModel({
            username: 'UnconfirmedUser',
            email: 'UnconfirmedUser@gmail.com',
            password: 'testpassword',
        });
        await unconfirmedUser.save()

        const unconfirmedUserCreds = { email: 'UnconfirmedUser@gmail.com', password: 'testpassword', stayLoggedIn: true };

        const res = await agent.post('/api/v1/users/login-local').send(unconfirmedUserCreds);

        expect(res).to.have.status(200);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('auth');
        expect(res).to.have.cookie('connect.sid'); // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true;
    });

    it('should successfully login a user even though the email is capitalized', async function () {
        const loginUser = { email: 'TESTUSER@gmail.com', password: 'testpassword', stayLoggedIn: true };
    
        const res = await agent.post('/api/v1/users/login-local').send(loginUser);
    
        expect(res).to.have.status(200);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('auth');
        expect(res).to.have.cookie('connect.sid'); // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true;
    });

    it('should successfully login a user with short session expiration if stayLoggedIn is false', async function () {
        const loginUser = { email: 'TestUser@gmail.com', password: 'testpassword', stayLoggedIn: false };
    
        const res = await agent.post('/api/v1/users/login-local').send(loginUser);
    
        expect(res).to.have.status(200);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('auth');
        expect(res).to.have.cookie('connect.sid'); // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true;
    
        // Check the expiration of the cookie
        const cookies = res.headers['set-cookie'];
        const sessionCookie = cookies.find((cookie: string) => cookie.startsWith('connect.sid'));
        const parsedCookie = parse(sessionCookie);
        const expiresDate = new Date(parsedCookie.Expires);

        const expectedExpiryDate = new Date(Date.now() + sessionExpiry * 1000);

        expect(expiresDate.getTime()).to.be.closeTo(expectedExpiryDate.getTime(), 10000); // Allowing a 5-second window
    });

    it('should successfully login a user with long session expiration if stayLoggedIn is true', async function () {
        const loginUser = { email: 'TestUser@gmail.com', password: 'testpassword', stayLoggedIn: true };
    
        const res = await agent.post('/api/v1/users/login-local').send(loginUser);
    
        expect(res).to.have.status(200);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('auth');
        expect(res).to.have.cookie('connect.sid'); // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true;
    
        // Check the expiration of the cookie
        const cookies = res.headers['set-cookie'];
        const sessionCookie = cookies.find((cookie: string) => cookie.startsWith('connect.sid'));
        const parsedCookie = parse(sessionCookie);
        const expiresDate = new Date(parsedCookie.Expires);

        const expectedExpiryDate = new Date(Date.now() + sessionPersistentExpiry * 1000);

        expect(expiresDate.getTime()).to.be.closeTo(expectedExpiryDate.getTime(), 5000); // Allowing a 5-second window
    });

    it('should successfully login a user with short session expiration if stayLoggedIn is not defined', async function () {
        const loginUser = { email: 'TestUser@gmail.com', password: 'testpassword' };
    
        const res = await agent.post('/api/v1/users/login-local').send(loginUser);
    
        expect(res).to.have.status(200);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('auth');
        expect(res).to.have.cookie('connect.sid'); // Expecting the default session cookie name.
        expect(res.body.auth).to.be.true;
    
        // Check the expiration of the cookie
        const cookies = res.headers['set-cookie'];
        const sessionCookie = cookies.find((cookie: string) => cookie.startsWith('connect.sid'));
        const parsedCookie = parse(sessionCookie);
        const expiresDate = new Date(parsedCookie.Expires);

        const expectedExpiryDate = new Date(Date.now() + sessionExpiry * 1000);

        expect(expiresDate.getTime()).to.be.closeTo(expectedExpiryDate.getTime(), 5000); // Allowing a 5-second window
    });

    it('should fail due to missing email', async function () {
        const incompleteUser = { password: 'testpassword', stayLoggedIn: true };

        const res = await agent.post('/api/v1/users/login-local').send(incompleteUser);

        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Email');
    });

    it('should fail due to missing password', async function () {
        const incompleteUser = { email: 'TestUser@gmail.com', stayLoggedIn: true };

        const res = await agent.post('/api/v1/users/login-local').send(incompleteUser);

        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Password');
    });

        it('should fail due to missing email and password', async function () {
        const incompleteUser = { stayLoggedIn: true };

        const res = await agent.post('/api/v1/users/login-local').send(incompleteUser);

        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Email and Password');
    });

    it('should fail due to invalid email format', async function () {
        const invalidEmailUser = { email: 'invalid-email', password: 'testpassword', stayLoggedIn: true };

        const res = await agent.post('/api/v1/users/login-local').send(invalidEmailUser);

        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Invalid email format');
    });

    it('should fail due to user not found', async function () {
        const notFoundUser = { email: 'NotFound@gmail.com', password: 'testpassword', stayLoggedIn: true };

        const res = await agent.post('/api/v1/users/login-local').send(notFoundUser);

        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('A user with the email NotFound@gmail.com was not found. Please check spelling or sign up');
    });

    it('should fail due to invalid credentials', async function () {
        const invalidCreds = { email: 'TestUser@gmail.com', password: 'wrongpassword', stayLoggedIn: true };

        const res = await agent.post('/api/v1/users/login-local').send(invalidCreds);

        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Invalid credentials');
    });
});

describe('User Logout Endpoint DELETE /api/v1/users/logout', function() {
    let agent: ChaiHttp.Agent;
    let registeredUser;

    beforeEach(async function() {
        registeredUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'testpassword',
        });
        registeredUser.confirmUser()
        await registeredUser.save()

        agent = chai.request.agent(server.app);  // Create an agent instance
        await agent.post('/api/v1/users/login-local').send({
            email: 'TestUser@gmail.com',
            password: 'testpassword',
            stayLoggedIn: true
        });
    });

    afterEach(async function() {
        await UserModel.findOneAndDelete({email: 'TestUser@gmail.com'}).exec();
        agent.close();  // Close the agent after tests
    });

    it('should successfully log out a user', async function() {
        
        const res = await agent.delete('/api/v1/users/logout');

        expect(res).to.have.status(200);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.equal('Logged out successfully');

        // Check that the session cookie has been cleared or invalidated.
        expect(res).to.not.have.cookie('connect.sid');

        // Test that the session is indeed invalidated:
        const protectedRes = await agent.get('/api/v1/users/events');
        expect(protectedRes).to.have.status(401);  // Assuming 401 is your status for unauthorized
    });

    it('should not allow logout without logging in', async function() {
        // Using a new agent that hasn't logged in:
        const newAgent = chai.request.agent(server.app);
        const res = await newAgent.delete('/api/v1/users/logout');

        expect(res).to.have.status(401);  // Assuming 401 is your status for unauthorized
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.equal('Unauthorized');  // Adjust this based on your actual message

        newAgent.close();
    });

    it('should not allow logout with an invalid session cookie', async function() {
        // Manipulating the session cookie (token) for the already logged-in user:
        const newAgent = chai.request.agent(server.app)
        newAgent.jar.setCookie('connect.sid=invalidSessionTokenHere', `localhost:${expressPort}`);

        const res = await newAgent.delete('/api/v1/users/logout');

        expect(res).to.have.status(401);  // Assuming 401 is your status for unauthorized
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.equal('Unauthorized');  // Adjust this based on your actual message
        
        newAgent.close()
    });
});


describe('Get User Events Endpoint GET /api/v1/users/events', function() {
    let agent: ChaiHttp.Agent
    let testUser: IUser;
    let testEvent: IEvent;

    beforeEach(async function() {
        testUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'testpassword',
        });
        testUser.confirmUser()
        await testUser.save();

        testEvent = new EventModel({
            eventName: 'TestEvent',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-01-02'),
        });

        await UserModel.findByIdAndUpdate(testUser._id, { $push: { events: testEvent._id } }).exec();
        
        const user = { email: testUser.email, password: 'testpassword', stayLoggedIn: true };
        agent = chai.request.agent(server.app);  // Create an agent instance

        // Log the user in to get a token
        await agent.post('/api/v1/users/login-local').send(user);
    });

    afterEach(async function() {
        // Cleanup: remove test user
        await UserModel.findOneAndDelete({email: 'TestUser@gmail.com'}).exec();
        agent.close();
    });

    it('should fetch user events successfully', async function () {
        const res = await agent.get('/api/v1/users/events')

        expect(res).to.have.status(200);
        expect(res.body).to.be.a('array');
        // Add more specific checks depending on your event data structure
    });

    it('should fail due to lack of authentication', async function () {
        const newAgent = chai.request.agent(server.app)
        const res = await newAgent.get('/api/v1/users/events');

        expect(res).to.have.status(401);
        expect(res.body.message).to.be.equal('Unauthorized');  // Assuming that's your error message for unauthorized
        
        newAgent.close()
    });
});

describe('Follow User Endpoint PUT /api/v1/users/following/:userId', function() {
    let userA: IUser, userB: IUser;
    let agent: ChaiHttp.Agent;

    beforeEach(async function() {
        // Create two test users
        userA = new UserModel({
            username: 'UserA',
            email: 'userA@gmail.com',
            password: 'passwordA'
        });
        userA.confirmUser()
        await userA.save();

        userB = new UserModel({
            username: 'UserB',
            email: 'userB@gmail.com',
            password: 'passwordB'
        });
        userB.confirmUser()
        await userB.save();

        // Login as userA
        agent = chai.request.agent(server.app);
        await agent.post('/api/v1/users/login-local').send({
            email: 'userA@gmail.com',
            password: 'passwordA'
        });
    });

    afterEach(async function() {
        // Cleanup: remove test users
        await UserModel.findOneAndDelete({ email: 'userA@gmail.com' }).exec();
        await UserModel.findOneAndDelete({ email: 'userB@gmail.com' }).exec();
        agent.close();
    });

    it('should allow userA to follow userB', async function () {
        const res = await agent.put(`/api/v1/users/following/${userB._id}`);

        expect(res).to.have.status(200);
        
        // Fetch both users from the database
        const updatedUserA = await UserModel.findById(userA._id).exec() as IUser;
        const updatedUserB = await UserModel.findById(userB._id).exec() as IUser;

        // Check that userA's following array contains userB's ID
        expect(updatedUserA.following).to.include(userB._id);

        // Check that userB's followers array contains userA's ID
        expect(updatedUserB.followers).to.include(userA._id);
    });

    it('should not allow following if user is not authenticated', async function() {
        const newAgent = chai.request.agent(server.app);  // New agent without logging in
        const res = await newAgent.put(`/api/v1/users/following/${userB._id}`);
        
        expect(res).to.have.status(401);
        expect(res.body.message).to.be.equal('Unauthorized');

        newAgent.close();
    });

    it('should not allow following a non-existent user', async function() {
        const invalidUserId = '5f5f5f5f5f5f5f5f5f5f5f5f';  // An example of a non-existent ObjectId
        const res = await agent.put(`/api/v1/users/following/${invalidUserId}`);
        
        expect(res).to.have.status(400);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('The user to be followed could not be found')
    });

    it('should not allow a user to follow themselves', async function() {
        const res = await agent.put(`/api/v1/users/following/${userA._id}`);
        
        expect(res).to.have.status(400);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('User cannot follow or un-follow themselves');
    });

    it('should handle when a user tries to follow another user they are already following', async function() {
        // First, let's make userA follow userB
        await agent.put(`/api/v1/users/following/${userB._id}`);
        
        // Now, try to follow again
        const res = await agent.put(`/api/v1/users/following/${userB._id}`);
        
        expect(res).to.have.status(200);  // Success
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.equal('User is already followed');  // Custom message
    });
});

describe('Unfollow User Endpoint PUT /api/v1/users/unfollow/:userId', function() {

    let userA: IUser, userB: IUser;
    let agent: ChaiHttp.Agent;

    beforeEach(async function() {
        // Create two test users
        userA = new UserModel({
            username: 'UserA',
            email: 'userA@gmail.com',
            password: 'passwordA'
        });
        userA.confirmUser()
        const savedUserA = await userA.save();

        userB = new UserModel({
            username: 'UserB',
            email: 'userB@gmail.com',
            password: 'passwordB'
        });
        userB.confirmUser()
        const savedUserB = await userB.save();

        // UserA follows UserB
        await Promise.all([
            UserModel.findByIdAndUpdate(savedUserA._id, { $push: { following: { $each: [savedUserB.id] } } }).exec(),
            UserModel.findByIdAndUpdate(savedUserB.id, { $push: { followers: { $each: [savedUserA.id] } } }).exec(),
        ])

        // Login as userA
        agent = chai.request.agent(server.app);
        await agent.post('/api/v1/users/login-local').send({
            email: 'userA@gmail.com',
            password: 'passwordA'
        });
    });

    afterEach(async function() {
        // Cleanup: remove test users
        await UserModel.findOneAndDelete({ email: 'userA@gmail.com' }).exec();
        await UserModel.findOneAndDelete({ email: 'userB@gmail.com' }).exec();
        agent.close();
    });

    it('should allow userA to unfollow userB', async function () {        
        const res = await agent.delete(`/api/v1/users/unfollow/${userB.id}`);
        expect(res).to.have.status(200);

        const updatedUserA = await UserModel.findById(userA._id).exec() as IUser;
        const updatedUserB = await UserModel.findById(userB._id).exec() as IUser;

        expect(updatedUserA.following.map(id => id)).to.not.include(userB.id);
        expect(updatedUserB.following.map(id => id)).to.not.include(userA.id);
    });

    it('should not allow unfollowing if user is not authenticated', async function() {
        const newAgent = chai.request.agent(server.app);
        const res = await newAgent.delete(`/api/v1/users/unfollow/${userB.id}`);

        expect(res).to.have.status(401);
        expect(res.body.message).to.be.equal('Unauthorized');
        
        newAgent.close();
    });

    it('should not allow unfollowing a non-existent user', async function() {
        const invalidUserId = '5f5f5f5f5f5f5f5f5f5f5f5f';
        const res = await agent.delete(`/api/v1/users/unfollow/${invalidUserId}`);
        
        expect(res).to.have.status(400);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('The user to be un-followed could not be found')
    });

    it('should not allow a user to unfollow themselves', async function() {
        const res = await agent.delete(`/api/v1/users/unfollow/${userA.id}`);

        expect(res).to.have.status(400);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('User cannot un-follow themselves');
    });

    it('should handle when a user tries to unfollow another user they are not following', async function() {
        // Introduce a new user
        const userC = new UserModel({
            username: 'UserC',
            email: 'userC@gmail.com',
            password: 'passwordC'
        });
        userC.confirmUser()
        await userC.save();

        const newAgent = chai.request.agent(server.app);
        await newAgent.post('/api/v1/users/login-local').send({
            email: 'userC@gmail.com',
            password: 'passwordC'
        });

        const res = await newAgent.delete(`/api/v1/users/unfollow/${userB.id}`);

        expect(res).to.have.status(400);  // Error (This status and the message below is a suggestion)
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('User is not followed');
        
        newAgent.close()
    });
});

describe('Update User Endpoint PATCH /update-user', function() {
    let testUser: IUser;
    let agent: ChaiHttp.Agent;

    beforeEach(async function() {
        // Create a test user
        testUser = new UserModel({
            username: 'TestUser',
            email: 'TestUser@gmail.com',
            password: 'TestPassword'
        });
        testUser.confirmUser()
        await testUser.save();

        agent = chai.request.agent(server.app);
        await agent.post('/api/v1/users/login-local').send({
            email: 'TestUser@gmail.com',
            password: 'TestPassword'
        });
    });

    afterEach(async function() {
        // Cleanup: remove test user
        await UserModel.findOneAndDelete({ email: 'TestUser@gmail.com' }).exec();
        agent.close();
    });

    it('should update TestUser details successfully', async function () {
        const updatedDetails = { 
            newUsername: 'UpdatedTestUser',
            newPassword: 'UpdatedPassword',
            confirmNewPassword: 'UpdatedPassword',
            oldPassword: 'TestPassword'
        };
        const res = await agent.patch('/api/v1/users/update-user').send(updatedDetails);

        expect(res).to.have.status(200);

        // Fetch the updated user from the database
        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser;
        
        expect(updatedTestUser.username).to.equal('UpdatedTestUser');
        expect(await updatedTestUser.comparePassword('UpdatedPassword')).to.be.true;

        expect(updatedTestUser.confirmed).to.be.true
        expect(updatedTestUser.toObject()).to.not.have.property('expirationDate');

        // Ensure password is hashed and not the plain-text password
        expect(updatedTestUser.password).to.not.equal('UpdatedPassword');
    });

    it('should not allow updating without authentication', async function() {
        const newAgent = chai.request.agent(server.app);
        const res = await newAgent.patch('/api/v1/users/update-user').send({ newUsername: 'newTestUser' });

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser;

        expect(updatedTestUser.confirmed).to.be.true
        expect(updatedTestUser.toObject()).to.not.have.property('expirationDate');

        expect(res).to.have.status(401);
        expect(res.body.message).to.be.equal('Unauthorized');

        newAgent.close();
    });

    it('should handle invalid or malformed data', async function() {
        const res = await agent.patch('/api/v1/users/update-user').send({ newUsername: '' });  // Empty username

        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser;

        expect(updatedTestUser.confirmed).to.be.true
        expect(updatedTestUser.toObject()).to.not.have.property('expirationDate');

        expect(res).to.have.status(400);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('No fields submitted')
    });

    it('should not allow password update with incorrect old password', async function() {
        const incorrectOldPasswordDetails = {
            newUsername: 'UpdatedTestUser',
            newPassword: 'UpdatedPassword2',
            confirmNewPassword: 'UpdatedPassword2',
            oldPassword: 'WrongOldPassword'
        };
        const res = await agent.patch('/api/v1/users/update-user').send(incorrectOldPasswordDetails);
        
        expect(res).to.have.status(400);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Old password does not match with user password');
    });
    
    it('should not allow password update with mismatching password and confirm password', async function() {
        const mismatchingPasswords = {
            newUsername: 'UpdatedTestUser2',
            newPassword: 'UpdatedPassword2',
            confirmNewPassword: 'WrongConfirmPassword',
            oldPassword: 'TestPassword'
        };
        const res = await agent.patch('/api/v1/users/update-user').send(mismatchingPasswords);
        
        expect(res).to.have.status(400);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('New password and Confirm New Password does not match');
    });

    it('should return an error if not all password fields are provided', async function() {
        const partialPasswordDetails = {
            newPassword: 'PartialUpdatePassword',
            confirmNewPassword: 'PartialUpdatePassword'
        };
        const res = await agent.patch('/api/v1/users/update-user').send(partialPasswordDetails);
        expect(res).to.have.status(400);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('When setting a new password, you must provide the old password, new password, and confirm new password');
    });
    
    it('should allow username update without password fields', async function() {
        const usernameUpdateDetails = {
            newUsername: 'JustUsernameUpdate'
        };
        const res = await agent.patch('/api/v1/users/update-user').send(usernameUpdateDetails);
        expect(res).to.have.status(200);
        const updatedTestUser = await UserModel.findById(testUser._id).exec() as IUser;
        expect(updatedTestUser.username).to.equal('JustUsernameUpdate');
    });    
    
});

