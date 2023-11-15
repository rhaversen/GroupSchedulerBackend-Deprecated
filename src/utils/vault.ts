import { type client } from 'node-vault'
import logger from './logger.js'

let vault: client

export async function connectToVault () {
    try {
        logger.silly('importing node-vault')
        const NodeVault = await import('node-vault')
        vault = NodeVault.default({
            endpoint: process.env.VAULT_ADDR, // Injected with initial .env
            token: process.env.VAULT_TOKEN // Injected with initial .env
        })
        logger.silly('Checking vault health')
        logger.info('Vault health: ' + await vault.health())
        logger.info("Connected to node-vault!")
    } catch (e) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('node-vault is required in production')
            process.exit(1)
        }
        logger.warn('node-vault is not installed. Falling back to .env')
    }
}

export async function loadSecrets () {
    logger.silly('defining keys')
    const keys: string[] =
    [
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
    logger.silly('determining node env')
    if (process.env.NODE_ENV === 'production') {
        logger.info('Loading secrets')
        try {
            for (const key of keys) {
                logger.silly('Loading secret for key ' + key)
                const secretResponse = await vault.read(`secret/data/backend/${key}`)
                const secret = secretResponse.data.data;
                process.env[key] = secret.value;
            }   
        } catch (err) {
            logger.error(`Failed to load secrets: ${err}`)
            logger.error(`Shutting down`)
            process.exit(1)
        }
    } else {
        logger.info('Using development .env')
        // .env values are already loaded by dotenv
    }
}
