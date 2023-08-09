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
    this.statusCode = 404;
  }
}

class InvalidEmailError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
  }
}

class InvalidPasswordError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
  }
}

class EmailAlreadyExistsError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
  }
}

class PasswordIncorrectError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
  }
}

class UserNotInEventError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 403;
  }
}

class UserNotAdminError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 403;
  }
}

class InvalidEventIdOrCode extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
  }
}

class MissingFieldsError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
  }
}

class InvalidConfirmationCodeError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
  }
}

class AlreadyConfirmedError extends ValidationError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
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
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export default {
  ValidationError,
  UserNotFoundError,
  InvalidEmailError,
  InvalidPasswordError,
  EmailAlreadyExistsError,
  PasswordIncorrectError,
  InvalidConfirmationCodeError,
  AlreadyConfirmedError,
  UserNotInEventError,
  UserNotAdminError,
  InvalidEventIdOrCode,
  MissingFieldsError,
  EventError,
  EventCodeError,
  EventNotFoundError,
  ServerError,
  HashingError
};
