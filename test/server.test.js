require('dotenv').config();

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server.js'); // Import your app

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /', () => {
  it(' should return the index page', function(done) {
    chai
      .request(server)
      .get('/')
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });
});

describe('POST /api/v1/users', () => {
    it('should create a new user and return it', function(done) {
      this.timeout(10000); // Set the timeout to 5 seconds.

      const newUser = {name: 'Test User', email: 'testuser@gmail.com', password: 'testpassword' };
  
      chai
        .request(server)
        .post('/api/v1/users')
        .send(newUser)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(201);
          expect(res.body).to.be.a('object');
          expect(res.body.user).to.have.property('email');
          expect(res.body.user.email).to.equal(newUser.email);
          done();
        });
    });
  });