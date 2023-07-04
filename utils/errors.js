//Validation errors
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
  }
}
  
class UserExistsError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class InvalidEmailError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class PasswordIncorrectError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class UserNotInEventError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

//Event errors
class EventError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
  }
}

class EventCodeError extends EventError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class MissingFieldsError extends EventError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class EventExistsError extends EventError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class UserInEventError extends EventError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

//Database errors
class DatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 500;
  }
}

class UserNotFoundError extends DatabaseError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

//Server errors
class ServerError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 500;
  }
}

class HashingError extends ServerError {
  constructor(message, underlyingError) {
    super(message);
    this.name = this.constructor.name;
    this.underlyingError = underlyingError;
  }
}