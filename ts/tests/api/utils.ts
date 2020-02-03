import supertest from 'supertest'
import { DexieStorageBackend } from '@worldbrain/storex-backend-dexie'
import inMemory from '@worldbrain/storex-backend-dexie/lib/in-memory'
import { StorageBackend } from '@worldbrain/storex';
import io from 'socket.io-client'
import { Application } from "../../application";
import { DevelopmentAccessTokenManager } from "../../access-tokens";
import { sequentialTokenGenerator } from "../../access-tokens.tests";
import { createHttpServer } from '../../server';
import { StorexHubApi_v0 } from '../../public-api';
import { createStorexHubClient } from '../../client';

export interface TestSetup {
    application: { api: () => Promise<StorexHubApi_v0> }
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
    const factory: TestFactory = (description, test?) => {
        it(description, test && (async () => {
            await test({ application: createTestApplication() })
        }))
    }
    return factory
}

function createHttpTestFactory(): TestFactory {
    const factory: TestFactory = (description, test?) => {
        it(description, test && (async () => {
            const application = createTestApplication()
            const server = await createHttpServer(application, {
                secretKey: 'bla'
            })
            await test({
                application: {
                    api: async () => {
                        const agent = supertest.agent(server.app.callback())
                        return createStorexHubClient(
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

function createWebsocketTestFactory() {
    const factory: TestFactory = (description, test?) => {
        it(description, test && (async () => {
            const application = createTestApplication()
            const server = await createHttpServer(application, {
                secretKey: 'bla'
            })

            await server.start()
            const sockets: SocketIOClient.Socket[] = []
            try {
                await test({
                    application: {
                        api: async () => {
                            const socket = io('http://localhost:3000', { forceNew: true })
                            sockets.push(socket)

                            const waitForConnection = new Promise((resolve, reject) => {
                                socket.once('connect', () => {
                                    resolve()
                                })
                            })
                            const waitForError = new Promise<never>((resolve, reject) => {
                                socket.once('error', (error: Error) => {
                                    reject(error)
                                })
                            })

                            await Promise.race([waitForConnection, waitForError])

                            return createStorexHubClient(
                                async (methodName, options) => {
                                    const waitForResponse = new Promise<{ result: any }>((resolve, reject) => {
                                        socket.once('response', (response: any) => {
                                            resolve(response)
                                        })
                                    })
                                    socket.emit('request', {
                                        methodName,
                                        methodOptions: options.methodOptions,
                                    })
                                    const response = await Promise.race([waitForResponse, waitForError])

                                    return {
                                        result: response.result,
                                    }
                                },
                                { identifier: 'methodName' }
                            )
                        }
                    }
                })
            } finally {
                await server.stop()
                for (const socket of sockets) {
                    socket.disconnect()
                }
            }
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

        describe('WebSocket API', () => {
            suite({ it: createWebsocketTestFactory() })
        })
    })
}