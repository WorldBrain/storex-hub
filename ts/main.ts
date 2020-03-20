import cryptoRandomString from 'crypto-random-string'
import { StorageBackend } from "@worldbrain/storex";
import { DexieStorageBackend } from '@worldbrain/storex-backend-dexie'
import inMemory from '@worldbrain/storex-backend-dexie/lib/in-memory'
import { TypeORMStorageBackend } from "@worldbrain/storex-backend-typeorm";
import { Application, ApplicationOptions } from "./application";
import { DevelopmentAccessTokenManager, BcryptAccessTokenManager } from "./access-tokens";
import { createHttpServer } from "./server";
import { sequentialTokenGenerator } from "./access-tokens.tests";

export async function main() {
    const application = new Application(getApplicationDependencies({
        dbFilePath: process.env.DB_PATH,
    }))
    await application.setup()
    const server = await createHttpServer(application, {
        secretKey: 'very secret key'
    })

    const port = 3000
    await server.start({ port })
    console.log(`Server started at http://localhost:${port}`)
}

function getApplicationDependencies(options: { dbFilePath?: string }) {
    let applicationDependencies: ApplicationOptions
    const accessTokenManager = new BcryptAccessTokenManager({
        tokenGenerator: async () => cryptoRandomString({ length: 24, type: 'base64' })
    })

    let storageBackendsCreated = 0
    if (options.dbFilePath) {
        const createStorageBackend = () => new TypeORMStorageBackend({
            connectionOptions: {
                type: 'sqlite',
                database: options.dbFilePath,
                name: `connection-${++storageBackendsCreated}`,
            } as any,
        })
        const closeStorageBackend = async (storageBackend: StorageBackend) => {
            await (storageBackend as TypeORMStorageBackend).connection?.close?.()
        }

        applicationDependencies = {
            accessTokenManager,
            createStorageBackend,
            closeStorageBackend,
        }
    } else {
        global['navigator'] = { userAgent: 'memory' } // Dexie checks this even if it doesn't exist

        const idbImplementation = inMemory()
        const createStorageBackend = () => new DexieStorageBackend({ dbName: 'test', idbImplementation })
        const closeStorageBackend = async (storageBackend: StorageBackend) => {
            await (storageBackend as DexieStorageBackend).dexieInstance.close()
        }
        applicationDependencies = {
            accessTokenManager,
            createStorageBackend,
            closeStorageBackend,
        }
    }

    return applicationDependencies
}

if (require.main === module) {
    main()
}

// curl -c cookies.txt -b cookies.txt 'http://localhost:3000/app/register' -H 'content-type: application/json' -d '{"name": "test", "identify": true}' ; echo
// curl -b cookies.txt 'http://localhost:3000/remote/operation' -H 'content-type: application/json' -d '{"app": "memex", "operation": ["findObjects", "tags", {}]}' ; echo

