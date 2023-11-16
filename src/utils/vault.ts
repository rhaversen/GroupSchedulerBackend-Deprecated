import { type client } from 'node-vault'
import logger from './logger.js'

let vault: client

export async function connectToVault () {
    if (process.env.NODE_ENV === 'production') {
        try {
            logger.silly('importing node-vault')
            const NodeVault = await import('node-vault')
            logger.silly('node-vault imported successfully')
            vault = NodeVault.default({
                endpoint: process.env.VAULT_ADDR, // Injected with initial .env
                token: process.env.VAULT_TOKEN // Injected with initial .env
            })
            logger.silly('Checking vault health')
            logger.info('Vault health: ' + JSON.stringify(await vault.health(), null, 2))
            logger.info('Connected to node-vault!')
        } catch (err) {
            logger.error('Error importing node-vault: ' + err)
            if (process.env.NODE_ENV === 'production') {
                logger.error('node-vault is required in production')
                process.exit(1)
            }
            logger.warn('node-vault is not installed. Falling back to .env')
        }
    } else {
        logger.info('Using development .env')
    }
}

export async function loadSecrets () {
    logger.silly('defining keys')
    const keys: string[] = [
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
        logger.info('Loading secrets from Vault')

        try {
            for (const key of keys) {
                logger.silly('Reading key: ' + key)
                const secretPath = `secret/backend/${key}`
                logger.silly('Secretpath: ' + secretPath)
                const secretResponse = await vault.read(secretPath)
                logger.silly('SecretResponse: ' + secretResponse)
                const secretValue = secretResponse.data.data[key]
                logger.silly('SecretValue: ' + secretValue)

                if (secretValue) {
                    process.env[key] = secretValue
                    logger.silly('Saved to env: ' + process.env[key])
                } else {
                    logger.warn(`Key ${key} not found in Vault`)
                }
            }
        } catch (err) {
            logger.error(`Failed to load secrets: ${err}`)
            logger.error('Shutting down')
            process.exit(1)
        }
    } else {
        logger.info('Using development .env')
        // .env values are already loaded by dotenv
    }
}
