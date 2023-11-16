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
    const keys = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'SESSION_SECRET', 'CSRF_SECRET', 'EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS']
    const vaultAddr = process.env.VAULT_ADDR // Vault address
    const token = process.env.VAULT_TOKEN // Vault token
    try {
        for (const key of keys) {
            logger.silly('Reading key: ' + key)
            const secretPath = `secret/data/backend/${key}` // Adjust path as needed
            logger.silly('Secretpath: ' + secretPath)
            const response: AxiosResponse<VaultResponse> = await axios.get(`${vaultAddr}/v1/${secretPath}`, {
                headers: { 'X-Vault-Token': token }
            })
            logger.silly('Response: ' + JSON.stringify(response, null, 2))

            if (response.data?.data?.data) {
                logger.silly('SecretValue: ' + JSON.stringify(response.data?.data?.data, null, 2))
                process.env[key] = response.data.data.data[key]
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
}
