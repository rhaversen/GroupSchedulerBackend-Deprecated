import axios, { type AxiosResponse } from 'axios'
import logger from './logger.js'

interface VaultSecretData {
    data: Record<string, string>
}

interface VaultResponse {
    data: VaultSecretData
    // Include other fields from the response as needed
}

export default async function loadVaultSecrets () {
    if (process.env.NODE_ENV !== 'production') {
        logger.info('Env is not production, not loading secrets from vault')
        return
    }

    const keys = ['BETTERSTACK_LOG_TOKEN', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'SESSION_SECRET', 'CSRF_SECRET', 'EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS']
    const vaultAddr = process.env.VAULT_ADDR // Vault address
    const token = process.env.VAULT_TOKEN // Vault token
    try {
        for (const key of keys) {
            const secretPath = `secret/data/backend/${key}`
            logger.debug('Fetching secret key at path: ' + secretPath)
            const response: AxiosResponse<VaultResponse> = await axios.get(`${vaultAddr}/v1/${secretPath}`, {
                headers: { 'X-Vault-Token': token }
            })

            if (response.data?.data?.data) {
                process.env[key] = response.data.data.data[key]
                if (process.env[key] == response.data.data.data[key]) {
                    logger.debug('Saved to env: ' + key + " = " + process.env[key])
                } else {
                    logger.error('Failed to save to env: ' + process.env[key])
                }
            } else {
                logger.warn(`Key ${key} not found in Vault`)
            }
        }

        // Check if all required keys are loaded
        const missingKeys = []
        for (const key of keys) {
            if (!process.env[key]) {
                missingKeys.push(key)
            }
        }
        if (missingKeys.length != 0) {
            throw new Error('Missing keys ' + missingKeys.toString())
        } else {
            logger.info('All secrets successfully loaded from vault!')
        }
    } catch (err) {
        logger.error(`Failed to load secrets: ${err}`)
        logger.error('Shutting down')
        process.exit(1)
    }
}
