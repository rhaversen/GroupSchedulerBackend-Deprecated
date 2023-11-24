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
let betterStackLogger: Logtail | null = null

function logToWinston (level: string, ...messages: any[]) {
    const combinedMessage = messages.join(' ')
    switch (level) {
        case 'error':
            winstonLogger.error(combinedMessage)
        break;
        case 'warn':
            winstonLogger.warn(combinedMessage)
        break;
        case 'info':
            winstonLogger.info(combinedMessage)
        break;
        case 'http':
            winstonLogger.http(combinedMessage)
        break;
        case 'verbose':
            winstonLogger.verbose(combinedMessage)
        break;
        case 'debug':
            winstonLogger.debug(combinedMessage)
        break;
        case 'silly':
            winstonLogger.silly(combinedMessage)
        break;
    }
}

function logToBetterStack (level: string, ...messages: any[]) {
    if (!process.env.BETTERSTACK_LOG_TOKEN || process.env.NODE_ENV !== 'production') {
        return
    }

    if (!betterStackLogger) {
        betterStackLogger = new Logtail(process.env.BETTERSTACK_LOG_TOKEN)
    }

    const combinedMessage = messages.join(' ')
    switch (level) {
        case 'error':
            betterStackLogger.error(combinedMessage)
        break;
        case 'warn':
            betterStackLogger.warn(combinedMessage)
        break;
        case 'info':
            betterStackLogger.info(combinedMessage)
        break;
        default:
            betterStackLogger.debug(combinedMessage)
    }
}
function log (level: string, ...messages: any[]) {
    logToBetterStack(level, messages)
    logToWinston(level, messages)
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
