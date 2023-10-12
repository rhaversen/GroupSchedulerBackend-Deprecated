class CustomError extends Error {
    statusCode: number
    constructor (message: string, statusCode: number = 400) {
        super(message)
        this.name = this.constructor.name
        this.statusCode = statusCode
    }
}

// Validation errors
export class ValidationError extends CustomError {}

export class UserNotFoundError extends ValidationError {
    constructor (message: string) {
        super(message, 404)
    }
}

export class InvalidEmailError extends ValidationError {}
export class InvalidCredentialsError extends ValidationError {}
export class EmailAlreadyExistsError extends ValidationError {}
export class PasswordIncorrectError extends ValidationError {}
export class MissingFieldsError extends ValidationError {}
export class InvalidConfirmationCodeError extends ValidationError {}
export class UserAlreadyConfirmedError extends ValidationError {}
export class UserNotConfirmedError extends ValidationError {}

export class UserNotInEventError extends ValidationError {
    constructor (message: string) {
        super(message, 403)
    }
}

export class UserNotAdminError extends ValidationError {
    constructor (message: string) {
        super(message, 403)
    }
}

export class InvalidEventIdOrCode extends ValidationError {}

// Event errors
export class EventError extends CustomError {}
export class EventCodeError extends EventError {}
export class EventNotFoundError extends EventError {}

// Server errors
export class ServerError extends CustomError {
    constructor (message: string) {
        super(message, 500)
    }
}
