import dotenv from 'dotenv';
dotenv.config();

import chai from 'chai';
import chaiHttp from 'chai-http';

chai.use(chaiHttp);
const { expect } = chai;

import { deleteAllDocumentsFromAllCollections } from '../database.js';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import error from '../utils/errors.js';

const {
  ServerError
} = error;

// Controller functions
import {
  registerUser,
  loginUser,
  getEvents,
  newCode,
  followUser,
  unfollowUser,
  getUser,
  updateUser
} from '../controllers/userController';

// Helper functions
async function establishFollowing(followingUser, followedUser) {
  followingUser.following.push(followedUser._id);
  followedUser.followers.push(followingUser._id);
  await followingUser.save();
  await followedUser.save();
  logger.info('User followed');
}

let server;

describe('Server Tests', () => {
  before(async function() {
    this.timeout(10000); // Set the timeout to 10 seconds.
    server = await import('../server');
    // Wipe database before testing
    await deleteAllDocumentsFromAllCollections()
  });

  beforeEach(async function() {
    this.timeout(10000); // Set the timeout to 10 seconds.
    // Define users
    const names = [
      'a1',
      'b2',
      'c3',
      'd4',
      'e5',
      'f6',
      'g7',
      'h8',
      'i9',
      'j10',
      'k11'
    ];
    const emails = [
      'a1@gmail.com',
      'b2@gmail.com',
      'c3@gmail.com',
      'd4@gmail.com',
      'e5@hot.com',
      'f6@hot.com',
      'g7@outlook.com',
      'h8@apple.com',
      'i9@outlook.com',
      'j10@microsoft.com',
      'k11@bing.com'
    ];
    const passwords = [
      '123',
      'abc',
      'abc123',
      '123abc',
      '123',
      'qwe',
      'rty',
      'ab12',
      'a1b2',
      'a2b1',
      'a123bc'
    ];

    logger.info('Creating users');

    // Create users
    let savedUserArray = [];
    for (let i = 0; i <= 10; i++){
      let name = names[i];
      let email = emails[i];
      let password = passwords[i];
      let newUser = new User({ name, email, password });
      let savedUser = await newUser.save();
      if (!savedUser){
        throw new ServerError('Error saving user')
      }
      savedUserArray[i] = savedUser;
      logger.info('User created')
    }

    // Follow users according to spreadsheet https://docs.google.com/spreadsheets/d/141samGt6TACfhqiGgxYQHJvSCWAKOiOF8dTemNfQrkk/edit

    const relations = [
      [0,	1],
      [1,	0],
      [2,	0],
      [2,	1],
      [2,	3],
      [2,	4],
      [2,	5],
      [2,	6],
      [2,	7],
      [2,	8],
      [2,	9],
      [2,	10],
      [3,	0],
      [3,	1],
      [3,	4],
      [3,	5],
      [3,	6],
      [3,	7],
      [3,	8],
      [3,	9],
      [3,	10],
      [0,	10],
      [1,	10],
      [2,	10],
      [3,	10],
      [4,	10],
      [5,	10],
      [6,	10],
      [7,	10],
      [8,	10],
      [9,	10],
      [10, 3],
      [4,	5],
      [6,	7],
      [6,	8],
      [6,	9],
      [6,	10],
      [7,	6],
      [7,	8],
      [7,	9],
      [7,	10],
      [8,	6],
      [8,	7],
      [8,	9],
      [8,	10],
      [9,	6],
      [9,	7],
      [9,	8],
      [9,	10],
      [10, 6],
      [10, 7],
      [10, 8],
      [10, 9],
    ];

    for (let relation of relations) {
      let followingUser = savedUserArray[relation[0]];
      let followedUser = savedUserArray[relation[1]];
      await establishFollowing(followingUser, followedUser);
    }
  });

  afterEach(async function() {
    this.timeout(10000); // Set the timeout to 10 seconds.
    // Wipe database after each test
    await deleteAllDocumentsFromAllCollections()
  });

  after(async function() {
    this.timeout(10000); // Set the timeout to 10 seconds.
    await server.shutDown();
  });

  it('POST /api/v1/users should create a new user and return a JWT token', async function () {
    this.timeout(10000); // Set the timeout to 10 seconds.
    logger.info('1');

    const newUser = { name: 'Test User', email: 'testuser@gmail.com', password: 'testpassword', stayLoggedIn: false };
    logger.info('2');

    const res = await chai.request(server.app).post('/api/v1/users').send(newUser);
    logger.info('3');

    expect(res).to.have.status(201);
    expect(res.body).to.be.a('object');
    expect(res.body).to.have.property('token');
    expect(res.body).to.have.property('auth');

    expect(res.body.auth).to.be.true;

    const token = res.body.token;

    // Here, you can further test the JWT token if needed, for example:
    // - Verify the token's signature
    // - Decode the token and check its payload

    // For simplicity, let's just check if the token exists
    expect(token).to.not.be.empty;
  });
});