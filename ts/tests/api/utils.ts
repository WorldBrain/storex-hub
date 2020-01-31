import supertest from 'supertest'
import { DexieStorageBackend } from '@worldbrain/storex-backend-dexie'
import inMemory from '@worldbrain/storex-backend-dexie/lib/in-memory'
import { StorageBackend } from '@worldbrain/storex';
import { Application } from "../../application";
import { DevelopmentAccessTokenManager } from "../../access-tokens";
import { sequentialTokenGenerator } from "../../access-tokens.tests";
import { createServer } from '../../server';
import { StorexClientAPI_v0 } from '../../public-api';
import { createStorexHubHttpClient } from '../../client';

export interface TestSetup {
    application: { api: () => Promise<StorexClientAPI_v0> }
}
export type TestFactory = (description: string, test?: (setup: TestSetup) => void | Promise<void>) => void

function createTestApplication() {
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

    return application
}

function createApiTestFactory(): TestFactory {
    function factory(description: string, test?: (setup: TestSetup) => void | Promise<void>) {
        it(description, test && (async () => {
            await test({ application: createTestApplication() })
        }))
    }
    return factory
}

function createHttpTestFactory(): TestFactory {
    function factory(description: string, test?: (setup: TestSetup) => void | Promise<void>) {
        it(description, test && (async () => {
            const application = createTestApplication()
            const server = await createServer(application, {
                secretKey: 'bla'
            })
            await test({
                application: {
                    api: async () => {
                        const agent = supertest.agent(server.app.callback())
                        return createStorexHubHttpClient(
                            async (url, options) => {
                                const response = await agent.post(url)
                                    .send(options.methodOptions)
                                    .set('Content-Type', 'application/json')
                                    .set('Accept', 'application/json')

                                return {
                                    result: response.body
                                }
                            }
                        )
                    }
                }
            })
        }))
    }
    return factory
}

export function createApiTestSuite(description: string, suite: (options: { it: TestFactory }) => void) {
    describe(description, () => {
        describe('Direct invocation', () => {
            suite({ it: createApiTestFactory() })
        })

        describe('HTTP API', () => {
            suite({ it: createHttpTestFactory() })
        })
    })
}