// Node.js built-in modules
import config from 'config'

// Third-party libraries
import { type HelmetOptions } from 'helmet'
import { type CorsOptions } from 'cors'
import { type Options as RateLimitOptions } from 'express-rate-limit'
import { type ConnectOptions } from 'mongoose'
import { type CookieOptions } from 'express'

// Own modules
import logger from './logger.js'

// Types
type ContentSecurityPolicyOptions = HelmetOptions['contentSecurityPolicy']
type HstsOptions = HelmetOptions['hsts']

// Convert config object to a plain object and then stringify it
const configString = JSON.stringify(config.util.toObject(config), null, 4)

// Log the configs used
logger.info(`Using configs:\n${configString}`)

/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
const AppConfig = {
    appName: config.get('mongoose.options.appName') as string,
    bcryptSaltRounds: config.get('bcrypt.saltRounds') as number,
    cookieOptions: config.get('cookieOptions') as CookieOptions,
    corsOpts: config.get('corsOpts') as CorsOptions,
    emailFrom: config.get('email.from') as string,
    emailPort: config.get('email.port') as number,
    expressPort: config.get('ports.express') as number,
    frontendDomain: config.get('frontend.domain') as string,
    helmetCSP: config.get('helmet.CSP') as ContentSecurityPolicyOptions,
    helmetHSTS: config.get('helmet.HSTS') as HstsOptions,
    maxRetryAttempts: config.get('mongoose.retrySettings.maxAttempts') as number,
    mongooseOpts: config.get('mongoose.options') as ConnectOptions,
    nanoidAlphabet: config.get('nanoid.alphabet') as string,
    nanoidLength: config.get('nanoid.length') as number,
    nextJsPort: config.get('ports.nextJs') as number,
    relaxedApiLimiterConfig: config.get('apiLimiter.nonSensitive') as RateLimitOptions,
    retryInterval: config.get('mongoose.retrySettings.interval') as number, // in milliseconds
    retryWrites: config.get('mongoose.options.retryWrites') as string,
    sensitiveApiLimiterConfig: config.get('apiLimiter.sensitive') as RateLimitOptions,
    sessionExpiry: config.get('session.expiry') as number,
    userExpiry: config.get('userSettings.unconfirmedUserExpiry') as number,
    w: config.get('mongoose.options.w') as string
}

export default AppConfig
