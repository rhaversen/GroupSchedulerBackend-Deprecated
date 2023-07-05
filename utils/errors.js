//Validation errors
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
  }
}

class UserNotFoundError extends ValidationError {
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

class EmailAlreadyExistsError extends ValidationError {
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

class UserNotAdminError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class InvalidEventIdOrCode extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class MissingFieldsError extends ValidationError {
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

class EventNotFoundError extends EventError {
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