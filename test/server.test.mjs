import dotenv from 'dotenv';
dotenv.config();

import chai from 'chai';
import chaiHttp from 'chai-http';

chai.use(chaiHttp);
const { expect } = chai;

import { deleteAllDocumentsFromAllCollections } from '../backend/database.mjs';
import logger from '../backend/utils/logger.mjs';

let server;


describe('Server Tests', () => {
  before(async () => {
    server = await import('../backend/server.mjs');
    // Wipe database before testing
    await deleteAllDocumentsFromAllCollections()
  });

  beforeEach(async () => {

  });

  afterEach(async () => {
    // Clear the database after each test
    // You need to implement the logic to clear your database here

    // Assuming you have a Mongoose model named "User" for the "users" collection

    // Wipe database after each test
    await deleteAllDocumentsFromAllCollections()
  });

  after(async () => {
    server.shutDown();
  });

  it('GET / should return the index page', async function () {
    this.timeout(10000); // Set the timeout to 10 seconds.

    const res = await chai.request(server.app).get('/');
    expect(res).to.have.status(200);
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