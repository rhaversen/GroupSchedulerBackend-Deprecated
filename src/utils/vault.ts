import { type client } from 'node-vault'
import logger from './logger.js'

let vault: client

try {
    const NodeVault = await import('node-vault')
    vault = NodeVault.default({
        endpoint: process.env.VAULT_ADDR, // Injected with initial .env
        token: process.env.VAULT_TOKEN // Injected with initial .env
    })
    logger.info("Connected to node-vault!")
} catch (e) {
    if (process.env.NODE_ENV === 'production') {
        logger.error('node-vault is required in production')
        process.exit(1)
    }
    logger.warn('node-vault is not installed. Falling back to .env')
}

export async function loadSecrets () {
    const keys: string[] =
    [
        'SESSION_SECRET',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'DB_HOST',
        'SESSION_SECRET',
        'CSRF_SECRET',
        'EMAIL_HOST',
        'EMAIL_USER',
        'EMAIL_PASS'
    ]
    if (process.env.NODE_ENV === 'production') {
        logger.info('Loading secrets')
        for (const key of keys) {
            try {
                logger.silly('Loading secret for key' + key)
                const secret = await vault.read(`secret/data/backend/${key}`)
                process.env[key] = secret.data.value
            } catch (err) {
                logger.error(`Failed to load secrets: ${err}`)
                logger.error(`Shutting down`)
                process.exit(1)
            }
        }
    } else {
        logger.info('Using development .env')
        // .env values are already loaded by dotenv
    }
}
