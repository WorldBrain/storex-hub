import { DexieStorageBackend } from '@worldbrain/storex-backend-dexie'
import inMemory from '@worldbrain/storex-backend-dexie/lib/in-memory'
import { Application } from "../../application";
import { DevelopmentAccessTokenManager } from "../../access-tokens";
import { sequentialTokenGenerator } from "../../access-tokens.tests";
import { StorageBackend } from '@worldbrain/storex';

export type TestFactory = (description: string, test?: (setup: { application: Application }) => void | Promise<void>) => void

function makeAPITestFactory(): TestFactory {
    function factory(description: string, test?: (setup: { application: Application }) => void | Promise<void>) {
        it(description, test && (async () => {
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
            await test({ application })
        }))
    }
    return factory
}

export function createApiTestSuite(description: string, suite: (options: { it: TestFactory }) => void) {
    describe(description, () => {
        suite({ it: makeAPITestFactory() })
    })
}