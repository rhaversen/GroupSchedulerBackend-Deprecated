// Node.js built-in modules
import config from 'config'

// Third-party libraries
import { type HelmetOptions } from 'helmet'
import { type CorsOptions } from 'cors'
import { type Options as RateLimitOptions } from 'express-rate-limit'
import { type ConnectOptions } from 'mongoose'

// Types
type ContentSecurityPolicyOptions = HelmetOptions['contentSecurityPolicy']
type HstsOptions = HelmetOptions['hsts']

export function getSaltRounds (): number {
    return config.get('bcrypt.saltRounds')
}

export function getNanoidAlphabet (): string {
    return config.get('nanoid.alphabet')
}

export function getNanoidLength (): number {
    return config.get('nanoid.length')
}

export function getUserExpiry (): number {
    return config.get('userSettings.unconfirmedUserExpiry')
}

export function getHelmetCSP (): ContentSecurityPolicyOptions {
    return config.get('helmet.CSP')
}

export function getHelmetHSTS (): HstsOptions {
    return config.get('helmet.HSTS')
}

export function getCorsOptions (): CorsOptions {
    return config.get('corsOpts')
}

export function getRelaxedApiLimiterConfig (): RateLimitOptions {
    return config.get('apiLimiter.nonSensitive')
}

export function getSensitiveApiLimiterConfig (): RateLimitOptions {
    return config.get('apiLimiter.sensitive')
}

export function getExpressPort (): number {
    return config.get('ports.express')
}

export function getTransporterPort (): number {
    return config.get('email.port')
}

export function getEmailFrom (): string {
    return config.get('email.from')
}

export function getMongooseOptions (): ConnectOptions {
    return config.get('mongoose.options')
}

export function getMaxRetryAttempts (): number {
    return config.get('mongoose.retrySettings.maxAttempts')
}

export function getRetryInterval (): number { // in milliseconds
    return config.get('mongoose.retrySettings.interval')
}

export function getSessionExpiry (): number {
    return config.get('session.expiry')
}

export function getSessionPersistentExpiry (): number {
    return config.get('session.persistentExpiry')
}

export function getNextJsPort (): number {
    return config.get('ports.nextJs')
}

export function getFrontendDomain (): string {
    return config.get('frontend.domain')
}
