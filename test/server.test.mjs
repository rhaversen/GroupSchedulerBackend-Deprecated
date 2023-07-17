import dotenv from 'dotenv';
dotenv.config();

import chai from 'chai';
import chaiHttp from 'chai-http';

chai.use(chaiHttp);
const { expect } = chai;

import { deleteAllDocumentsFromAllCollections } from '../database.mjs';
import logger from '../utils/logger.mjs';
import User from '../models/User.mjs';
import error from '../utils/errors.mjs';

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
  updatePassword,
  updateName
} from '../controllers/userController.mjs';

let server;

describe('Server Tests', () => {
  before(async () => {
    server = await import('../server.mjs');
    // Wipe database before testing
    await deleteAllDocumentsFromAllCollections()
  });

  beforeEach(async () => {
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
    let savedUserArray;
    for (let i = 0; i < 10; i++){
      let name = names[i];
      let email = emails[i];
      let password = passwords[i];
      let newUser = new User({ name, email, password });
      let savedUser = await newUser.save();
      if (!savedUser){
        throw new ServerError('Error saving user')
      }
      savedUserArray[i] = savedUser;
      logger.info(name + ' ' + email + ' ' + password + ' ' + savedUser);
    }

    // Follow users according to spreadsheet https://docs.google.com/spreadsheets/d/141samGt6TACfhqiGgxYQHJvSCWAKOiOF8dTemNfQrkk/edit

    // savedUserArray[0].name = 'a1'
    // savedUserArray[1].name = 'b2'

    let followingUser;
    let followedUser;

    // a1 f b2
    followingUser = savedUserArray[0];
    followedUser = savedUserArray[1];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // b2 f a1
    followingUser = savedUserArray[1];
    followedUser = savedUserArray[0];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // c3 f a1
    followingUser = savedUserArray[2];
    followedUser = savedUserArray[0];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f b2
    followedUser = savedUserArray[1];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f d4
    followedUser = savedUserArray[3];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f e5
    followedUser = savedUserArray[4];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f f6
    followedUser = savedUserArray[5];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f g7
    followedUser = savedUserArray[6];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f h8
    followedUser = savedUserArray[7];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f i9
    followedUser = savedUserArray[8];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f j10
    followedUser = savedUserArray[9];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f k11
    followedUser = savedUserArray[10];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // d4 f a1
    followingUser = savedUserArray[3];
    followedUser = savedUserArray[0];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f b2
    followedUser = savedUserArray[1];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f e5
    followedUser = savedUserArray[4];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f f6
    followedUser = savedUserArray[5];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f g7
    followedUser = savedUserArray[6];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f h8
    followedUser = savedUserArray[7];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f i9
    followedUser = savedUserArray[8];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f j10
    followedUser = savedUserArray[9];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // f k11
    followedUser = savedUserArray[10];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();  

    // a1 f d4
    followingUser = savedUserArray[0];
    followedUser = savedUserArray[3];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // b2 f
    followingUser = savedUserArray[1];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();
  
    //c3 f
    followingUser = savedUserArray[2];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // d4 f
    followingUser = savedUserArray[3];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // e5 f
    followingUser = savedUserArray[4];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f6 f
    followingUser = savedUserArray[5];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // g7 f
    followingUser = savedUserArray[6];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // h8 f
    followingUser = savedUserArray[7];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // i9 f
    followingUser = savedUserArray[8];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // j10 f
    followingUser = savedUserArray[9];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // k11 f
    followingUser = savedUserArray[10];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // k11 f d4
    followingUser = savedUserArray[10];
    followedUser = savedUserArray[3];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // e5 f f6
    followingUser = savedUserArray[4];
    followedUser = savedUserArray[5];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // g7 f h8
    followingUser = savedUserArray[6];
    followedUser = savedUserArray[7];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f i9
    followedUser = savedUserArray[8];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f j10
    followedUser = savedUserArray[9];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f k11
    followedUser = savedUserArray[10];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // h8 f g7
    followingUser = savedUserArray[7];
    followedUser = savedUserArray[6];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f i9
    followedUser = savedUserArray[8];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f j10
    followedUser = savedUserArray[9];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f k11
    followedUser = savedUserArray[10];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // i9 f g7
    followingUser = savedUserArray[8];
    followedUser = savedUserArray[6];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f h8
    followedUser = savedUserArray[7];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f j10
    followedUser = savedUserArray[9];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f k11
    followedUser = savedUserArray[10];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // j10 f g7
    followingUser = savedUserArray[9];
    followedUser = savedUserArray[6];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f h8
    followedUser = savedUserArray[7];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f i9
    followedUser = savedUserArray[8];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f k11
    followedUser = savedUserArray[10];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // k11 f g7
    followingUser = savedUserArray[10];
    followedUser = savedUserArray[6];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f h8
    followedUser = savedUserArray[7];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f i9
    followedUser = savedUserArray[8];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();

    // f j10
    followedUser = savedUserArray[9];
    followingUser.following.push(followedUser);
    followedUser.followers.push(followingUser);
    followingUser.save();
    followedUser.save();
  });

  afterEach(async () => {
    // Wipe database after each test
    await deleteAllDocumentsFromAllCollections()
  });

  after(async () => {
    server.shutDown();
  });

  it('POST /api/v1/users should create a new user and return a JWT token', async function () {
    this.timeout(10000); // Set the timeout to 10 seconds.

    const newUser = { name: 'Test User', email: 'testuser@gmail.com', password: 'testpassword' };

    const res = await chai.request(server.app).post('/api/v1/users').send(newUser);

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