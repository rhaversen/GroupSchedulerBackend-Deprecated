import { type client } from 'node-vault'

let vault: client

try {
    const NodeVault = await import('node-vault')
    vault = NodeVault.default({
        endpoint: 'http://localhost:8200',
        token: process.env.VAULT_TOKEN
    })
} catch (e) {
    if (process.env.NODE_ENV === 'production') {
        console.error('node-vault is required in production')
        process.exit(1)
    }
    console.warn('node-vault is not installed. Falling back to .env')
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
                const secret = await vault.read(`path/to/your/secret/${key}`)
                process.env[key] = secret.data.value
            }
        } else {
            // .env values are already loaded by dotenv
        }
    } catch (err) {
        console.error(`Failed to load secrets: ${err}`)
    }
}
