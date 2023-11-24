// Node.js built-in modules
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Logtail } from '@logtail/node'

// Third-party libraries
import { createLogger, format as _format, transports as _transports } from 'winston'

// Global variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const winstonLogger = createLogger({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6
    },
    format: _format.combine(
        _format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:SSS' }),
        _format.json(), // Use JSON format for logs
        _format.printf((logObject) => {
            return `${logObject.timestamp} ${logObject.level}: ${logObject.message}`
        })
    ),
    defaultMeta: { service: 'group-scheduler-backend' }, // Set a default metadata field
    transports: [
        new _transports.File({ filename: join(__dirname, '../../../logs/error.log'), level: 'error' }),
        new _transports.File({ filename: join(__dirname, '../../../logs/info.log'), level: 'info' }),
        new _transports.File({ filename: join(__dirname, '../../../logs/combined.log'), level: 'silly' }),
        new _transports.Console({
            format: _format.combine(
                _format.colorize(),
                _format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
                _format.printf((logObject) => {
                    return `${logObject.timestamp} ${logObject.level}: ${logObject.message}`
                })
            ),
            level: 'info'
        })
    ]
})

// Instantiate betterStackLogger only in production
const betterStackLogger = process.env.NODE_ENV === 'production' ? new Logtail(process.env.BETTERSTACK_LOG_TOKEN as string) : null

// Define a type for log levels
type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly'

// Function to check if logger has a method for the given log level
function hasLogLevelMethod (logger: any, level: LogLevel): logger is { [key in LogLevel]: Function } {
    return typeof logger === 'object' && logger !== null && level in logger
}

function logMessage (logger: any, level: LogLevel, messages: any[]) {
    const combinedMessage = messages.join(' ')
    if (hasLogLevelMethod(logger, level)) {
        logger[level](combinedMessage)
    }
}

function log (level: LogLevel, ...messages: any[]) {
    logMessage(winstonLogger, level, messages)
    logMessage(betterStackLogger, level, messages)
}

const logger = {
    error: (...messages: any[]) => { log('error', ...messages) },
    warn: (...messages: any[]) => { log('warn', ...messages) },
    info: (...messages: any[]) => { log('info', ...messages) },
    http: (...messages: any[]) => { log('http', ...messages) },
    verbose: (...messages: any[]) => { log('verbose', ...messages) },
    debug: (...messages: any[]) => { log('debug', ...messages) },
    silly: (...messages: any[]) => { log('silly', ...messages) }
}

export default logger
