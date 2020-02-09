import { StorageBackend } from "@worldbrain/storex";
import { DexieStorageBackend } from '@worldbrain/storex-backend-dexie'
import inMemory from '@worldbrain/storex-backend-dexie/lib/in-memory'
import { createHttpServer } from "./server";
import { Application } from "./application";
import { DevelopmentAccessTokenManager } from "./access-tokens";
import { sequentialTokenGenerator } from "./access-tokens.tests";

export async function main() {
    global['navigator'] = { userAgent: 'memory' } // Dexie checks this even if it doesn't exist
    const idbImplementation = inMemory()
    const createStorageBackend = () => new DexieStorageBackend({ dbName: 'test', idbImplementation })
    const application = new Application({
        accessTokenManager: new DevelopmentAccessTokenManager({ tokenGenerator: sequentialTokenGenerator() }),
        createStorageBackend,
        closeStorageBackend: async (storageBackend: StorageBackend) => {
            await (storageBackend as DexieStorageBackend).dexieInstance.close()
        }
    })
    await application.setup()
    const server = await createHttpServer(application, {
        secretKey: 'very secret key'
    })

    const port = 3000
    await server.start({ port })
    console.log(`Server started at http://localhost:${port}`)
}

if (require.main === module) {
    main()
}

// curl -c cookies.txt -b cookies.txt 'http://localhost:3000/app/register' -H 'content-type: application/json' -d '{"name": "test", "identify": true}' ; echo
// curl -b cookies.txt 'http://localhost:3000/remote/operation' -H 'content-type: application/json' -d '{"app": "memex", "operation": ["findObjects", "tags", {}]}' ; echo

