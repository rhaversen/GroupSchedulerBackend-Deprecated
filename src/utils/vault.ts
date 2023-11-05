import { type client } from 'node-vault'
import logger from './logger.js'

let vault: client

try {
    logger.error(process.env.VAULT_TOKEN)
    const NodeVault = await import('node-vault')
    vault = NodeVault.default({
        endpoint: 'https://localhost:8200',
        token: process.env.VAULT_TOKEN
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
        'DB_URI',
        'OTHER_SECRET',
        'DB_PORT',
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
    try {
        if (process.env.NODE_ENV === 'production' && vault) {
            for (const key of keys) {
                const secret = await vault.read(`secret/data/backend/${key}`)
                process.env[key] = secret.data.value
            }
        } else {
            // .env values are already loaded by dotenv
        }
    } catch (err) {
        logger.error(`Failed to load secrets: ${err}`)
    }
}
