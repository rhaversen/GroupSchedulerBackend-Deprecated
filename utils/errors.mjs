class CustomError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

// Validation errors
class ValidationError extends CustomError {}

class UserNotFoundError extends ValidationError {
  constructor(message) {
    super(message, 404);
  }
}

class InvalidEmailError extends ValidationError {}
class InvalidPasswordError extends ValidationError {}
class EmailAlreadyExistsError extends ValidationError {}
class PasswordIncorrectError extends ValidationError {}
class MissingFieldsError extends ValidationError {}
class InvalidConfirmationCodeError extends ValidationError {}
class UserAlreadyConfirmedError extends ValidationError {}
class UserNotConfirmedError extends ValidationError {}


class UserNotInEventError extends ValidationError {
  constructor(message) {
    super(message, 403);
  }
}

class UserNotAdminError extends ValidationError {
  constructor(message) {
    super(message, 403);
  }
}

class InvalidEventIdOrCode extends ValidationError {}

// Event errors
class EventError extends CustomError {}
class EventCodeError extends EventError {}
class EventNotFoundError extends EventError {}

// Server errors
class ServerError extends CustomError {
  constructor(message) {
    super(message, 500);
  }
}

class HashingError extends ServerError {}

export default {
  ValidationError,
  UserNotFoundError,
  InvalidEmailError,
  InvalidPasswordError,
  EmailAlreadyExistsError,
  PasswordIncorrectError,
  InvalidConfirmationCodeError,
  UserAlreadyConfirmedError,
  UserNotConfirmedError,
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