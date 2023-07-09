require('dotenv').config();

const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const { expect } = chai;

import { deleteAllDocumentsFromAllCollections } from './database.mjs';


let server;

describe('Server Tests', () => {
  before(async () => {
    server = await import('../server.mjs');
    
  });

  after(async () => {
    // Perform any necessary cleanup after the entire test suite
    // For example, close any open connections, stop the server, etc.
    // This is executed once after all tests in this suite have finished

    // Close the server (Automatically disconnects from the database)
    await deleteAllDocumentsFromAllCollections();
  });

  afterEach(async () => {
    // Clear the database after each test
    // You need to implement the logic to clear your database here

    // Assuming you have a Mongoose model named "User" for the "users" collection

    // Delete all user records
    await server.default.User.deleteMany({});
  });

  it('GET / should return the index page', async function () {
    this.timeout(10000); // Set the timeout to 10 seconds.

    const res = await chai.request(server.default).get('/');
    expect(res).to.have.status(200);
  });

  it('POST /api/v1/users should create a new user and return a JWT token', async function () {
    this.timeout(10000); // Set the timeout to 10 seconds.

    const newUser = { name: 'Test User', email: 'testuser@gmail.com', password: 'testpassword' };

    const res = await chai.request(server.default).post('/api/v1/users').send(newUser);

    expect(res).to.have.status(201);
    expect(res.body).to.be.a('object');
    expect(res.body).to.have.property('token');

    const token = res.body.token;

    // Here, you can further test the JWT token if needed, for example:
    // - Verify the token's signature
    // - Decode the token and check its payload

    // For simplicity, let's just check if the token exists
    expect(token).to.not.be.empty;
  });
});