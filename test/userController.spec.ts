import dotenv from 'dotenv'
import chai from 'chai'
import chaiHttp from 'chai-http'

import logger from '../utils/logger.js'
import UserModel, { type IUser } from '../models/User.js'
import EventModel, { type IEvent } from '../models/Event.js'
import error from '../utils/errors.js'
import { AppType, ShutDownType } from '../server.js'

dotenv.config()

chai.use(chaiHttp)
const { expect } = chai

const server = await import('../server.js')
// Wipe database before testing

after(async function () {
    this.timeout(10000) // Set the timeout to 10 seconds.
    await server.shutDown()
})

describe('User Registration Endpoint POST /api/v1/users', function() {    
    let testUser = { username: 'Test User', email: 'testuser@gmail.com', password: 'testpassword', confirmPassword: 'testpassword' };
    
    afterEach(async function() {
        // Remove test user if exists before running tests
        await UserModel.findOneAndDelete({email: 'testuser@gmail.com'}).exec()
    });

    it('should successfully register a new user', async function () {     
        const res = await chai.request(server.app).post('/api/v1/users').send(testUser);
        
        expect(res).to.have.status(201);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.equal('Registration successful! Please check your email to confirm your account within 24 hours or your account will be deleted.');
    });

    it('should fail due to missing fields (email)', async function () {
        const incompleteUser = { username: 'Test User', password: 'testpassword', confirmPassword: 'testpassword' };
        
        const res = await chai.request(server.app).post('/api/v1/users').send(incompleteUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for missing fields
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Username, Email, Password and/or Confirm Password');
    });

    it('should fail due to missing fields (username)', async function () {
        const incompleteUser = { email: 'testuser@gmail.com', password: 'testpassword', confirmPassword: 'testpassword' };
        
        const res = await chai.request(server.app).post('/api/v1/users').send(incompleteUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for missing fields
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Username, Email, Password and/or Confirm Password');
    });

    it('should fail due to missing fields (password)', async function () {
        const incompleteUser = { username: 'Test User', email: 'testuser@gmail.com', confirmPassword: 'testpassword' };
        
        const res = await chai.request(server.app).post('/api/v1/users').send(incompleteUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for missing fields'
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Username, Email, Password and/or Confirm Password');
    });

    it('should fail due to missing fields (confirmPassword)', async function () {
        const incompleteUser = { username: 'Test User', email: 'testuser@gmail.com', password: 'testpassword' };
        
        const res = await chai.request(server.app).post('/api/v1/users').send(incompleteUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for missing fields
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Username, Email, Password and/or Confirm Password');
    });

    it('should fail due to invalid email', async function () {
        const invalidEmailUser = { ...testUser, email: 'invalid-email' };
        
        const res = await chai.request(server.app).post('/api/v1/users').send(invalidEmailUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for invalid email
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Invalid email format');
    });

    it('should fail due to password mismatch', async function () {
        const passwordMismatchUser = { ...testUser, confirmPassword: 'differentpassword' };
        
        const res = await chai.request(server.app).post('/api/v1/users').send(passwordMismatchUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for password mismatch
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal("Password and Confirm Password doesn't match");
    });

    it('should fail due to short password', async function () {
        const shortPasswordUser = { ...testUser, password: '123', confirmPassword: '123' };
        
        const res = await chai.request(server.app).post('/api/v1/users').send(shortPasswordUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for short password
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Password must be at least 5 characters');
    });

    it('should fail due to email already exists', async function () {
        const user = new UserModel({...testUser, confirmed: true });
        await user.save();

        const res = await chai.request(server.app).post('/api/v1/users').send(testUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for email already exists
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Email already exists, please sign in instead');
    });

    it('should fail due to email exists but not confirmed', async function () {
        const unconfirmedUser = new UserModel({...testUser, confirmed: false });
        await unconfirmedUser.save();

        const res = await chai.request(server.app).post('/api/v1/users').send(testUser);

        expect(res).to.have.status(400);  // assuming 400 is the status code for email exists but not confirmed
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Email already exists but is not confirmed. Please follow the link sent to your email inbox');
    });
});

describe('User Confirmation Endpoint POST /api/v1/users/confirm/:userCode', function() {
    let savedUser: IUser
    let userCode: string
    
    beforeEach(async function() {
        // Create a user before running tests
        const newUser = new UserModel({
            username: 'ToBeConfirmed',
            email: 'toBeConfirmed@gmail.com',
            password: 'toBeConfirmedPassword',
        });
        savedUser = await newUser.save();
        userCode = savedUser.userCode;
    });

    afterEach(async function() {
        // Remove test user if exists before running tests
        await UserModel.findOneAndDelete({email: 'toBeConfirmed@gmail.com'}).exec()
    });

    it('should confirm a user', async function () {
        const res = await chai.request(server.app).post(`/api/v1/users/confirm/${userCode}`).send();
        expect(res).to.have.status(200)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('message')
        expect(res.body.message).to.be.equal('Confirmation successful! Your account has been activated.');
        
        const confirmedUser = await UserModel.findOne({userCode}).exec() as IUser
        expect(confirmedUser.confirmed).to.be.true
    });

    it('should fail if invalid code provided', async function () {
        const res = await chai.request(server.app).post(`/api/v1/users/confirm/INVALID_CODE`).send()
        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('Invalid confirmation code')
    });

    it('should fail if user already confirmed', async function () {
        await chai.request(server.app).post(`/api/v1/users/confirm/${userCode}`).send()
        const res = await chai.request(server.app).post(`/api/v1/users/confirm/${userCode}`).send()
        expect(res).to.have.status(400)
        expect(res.body).to.be.a('object')
        expect(res.body).to.have.property('error')
        expect(res.body.error).to.be.equal('User has already been confirmed')
    });
});

describe('User Login Endpoint POST /api/v1/users/login', function() {
    let registeredUser;

    beforeEach(async function() {
        // Create a user for login tests
        registeredUser = new UserModel({
            username: 'TestUser',
            email: 'testuser@gmail.com',
            password: 'testpassword',
        });
        registeredUser.confirmUser()
        await registeredUser.save()
    });

    afterEach(async function() {
        // Cleanup: remove test user
        await UserModel.findOneAndDelete({email: 'testuser@gmail.com'}).exec();
    });

    it('should successfully login a user', async function () {
        const loginUser = { email: 'testuser@gmail.com', password: 'testpassword', stayLoggedIn: true };

        const res = await chai.request(server.app).post('/api/v1/users/login').send(loginUser);

        expect(res).to.have.status(200);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('auth');
        expect(res).to.have.cookie('token');
        expect(res.body.auth).to.be.true;
    });

    it('should fail due to missing fields', async function () {
        const incompleteUser = { email: 'testuser@gmail.com', stayLoggedIn: true };

        const res = await chai.request(server.app).post('/api/v1/users/login').send(incompleteUser);

        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Missing Email, Password and/or "Stay logged in"');
    });

    it('should fail due to invalid email format', async function () {
        const invalidEmailUser = { email: 'invalid-email', password: 'testpassword', stayLoggedIn: true };

        const res = await chai.request(server.app).post('/api/v1/users/login').send(invalidEmailUser);

        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Invalid email format');
    });

    it('should fail due to user not found', async function () {
        const notFoundUser = { email: 'notfound@gmail.com', password: 'testpassword', stayLoggedIn: true };

        const res = await chai.request(server.app).post('/api/v1/users/login').send(notFoundUser);

        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('A user with the email notfound@gmail.com was not found. Please check spelling or sign up');
    });

    it('should fail due to invalid credentials', async function () {
        const invalidCreds = { email: 'testuser@gmail.com', password: 'wrongpassword', stayLoggedIn: true };

        const res = await chai.request(server.app).post('/api/v1/users/login').send(invalidCreds);

        expect(res).to.have.status(401);
        expect(res.body).to.have.property('error');
        expect(res.body.error).to.be.equal('Invalid credentials');
    });
});

describe('User Logout Endpoint POST /api/v1/users/logout', function() {
    let agent = chai.request.agent(server.app);  // Create an agent instance
    let registeredUser;

    beforeEach(async function() {
        // Create a user for logout tests
        registeredUser = new UserModel({
            username: 'TestUser',
            email: 'testuser@gmail.com',
            password: 'testpassword',
        });
        registeredUser.confirmUser()
        await registeredUser.save();

        // This might be needed: Login the user to generate the token and set the cookie.
        await agent.post('/api/v1/users/login').send({
            email: 'testuser@gmail.com',
            password: 'testpassword',
            stayLoggedIn: true
        });
    });

    afterEach(async function() {
        // Cleanup: remove test user
        await UserModel.findOneAndDelete({email: 'testuser@gmail.com'}).exec();
    });

    after(function() {
        agent.close();  // Close the agent after tests
    });

    it('should successfully log out a user', async function() {
        const res = await agent.post('/api/v1/users/logout');

        expect(res).to.have.status(200);
        expect(res.body).to.be.a('object');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be.equal('Logged out successfully');

        // Check that the 'token' cookie is not present
        expect(res).to.not.have.cookie('token');
    });

    // You can add more specific scenarios as required, for instance:
    // If your system has scenarios where a user can't log out without being logged in first, you should test that as well.
    // Or scenarios where an invalid token is presented, etc.
});

describe('Get User Events Endpoint GET /api/v1/users/events', function() {
    let agent = chai.request.agent(server.app);  // Create an agent instance
    let token: string;
    let testUser: IUser;
    let testEvent: IEvent;

    beforeEach(async function() {
        testUser = new UserModel({
            username: 'TestUser',
            email: 'testuser@gmail.com',
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
        
        // Log the user in to get a token
        const res = await agent.post('/api/v1/users/login').send(user);
        token = res.body.token;
    });

    afterEach(async function() {
        // Cleanup: remove test user
        await UserModel.findOneAndDelete({email: 'testuser@gmail.com'}).exec();
    });

    it('should fetch user events successfully', async function () {
        const res = await agent
            .get('/api/v1/users/events')
            .set('Authorization', `Bearer ${token}`);

        expect(res).to.have.status(200);
        expect(res.body).to.be.a('array');
        // Add more specific checks depending on your event data structure
    });

    it('should fail due to lack of authentication', async function () {
        const res = await agent
            .get('/api/v1/users/events');

        expect(res).to.have.status(401);
        expect(res.body.message).to.be.equal('Unauthorized');  // Assuming that's your error message for unauthorized
    });
});
