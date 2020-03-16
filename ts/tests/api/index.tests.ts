import Koa from 'koa'
import supertest from 'supertest'
import { DexieStorageBackend } from '@worldbrain/storex-backend-dexie'
import inMemory from '@worldbrain/storex-backend-dexie/lib/in-memory'
import { StorageBackend } from '@worldbrain/storex';
import io from 'socket.io-client'
import { Application, ApplicationApiOptions } from "../../application";
import { DevelopmentAccessTokenManager } from "../../access-tokens";
import { sequentialTokenGenerator } from "../../access-tokens.tests";
import { createHttpServer } from '../../server';
import { StorexHubApi_v0, StorexHubCallbacks_v0 } from '../../public-api';
import { createStorexHubClient, createStorexHubSocketClient } from '../../client';

export type TestSetup<ApiOptions = never, OptionsRequired extends boolean = true> = OptionsRequired extends true
    ? { createSession(options: ApiOptions): Promise<TestSession> }
    : { createSession(options?: ApiOptions): Promise<TestSession> }
export interface TestSession {
    api: StorexHubApi_v0
    close(): Promise<void>
}

export type MultiApiOptions = { type: 'websocket' | 'http' } & ApplicationApiOptions
export type TestFactory<ApiOptions = never, OptionsRequired extends boolean = true> = (description: string, test?: (setup: TestSetup<ApiOptions, OptionsRequired>) => void | Promise<void>) => void
export type TestSuite<ApiOptions = never, OptionsRequired extends boolean = true> = (options: { it: TestFactory<ApiOptions, OptionsRequired> }) => void

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

function createApiTestFactory() {
    const factory: TestFactory<ApplicationApiOptions, false> = (description, test?) => {
        it(description, test && (async () => {
            const application = createTestApplication()
            await test({
                createSession: async () => {
                    return {
                        api: await application.api(),
                        close: async () => { }
                    }
                }
            })
        }))
    }
    return factory
}

function createHttpTestFactory() {
    const factory: TestFactory<ApplicationApiOptions, false> = (description, test?) => {
        it(description, test && (async () => {
            const application = createTestApplication()
            const server = await createHttpServer(application, {
                secretKey: 'bla'
            })
            await test({
                createSession: async () => {
                    return {
                        api: await createSupertestApi(server.app),
                        async close() {

                        }
                    }
                }
            })
        }))
    }
    return factory
}

function createSupertestApi(app: Koa) {
    const agent = supertest.agent(app.callback())
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

function createWebsocketTestFactory() {
    const factory: TestFactory<ApplicationApiOptions, false> = (description, test?) => {
        it(description, test && (async () => {
            const application = createTestApplication()
            const server = await createHttpServer(application, {
                secretKey: 'bla'
            })

            await server.start()
            const sockets: SocketIOClient.Socket[] = []
            try {
                await test({
                    createSession: async () => {
                        const socket = io('http://localhost:3000', { forceNew: true })
                        sockets.push(socket)

                        const client = await createStorexHubSocketClient(socket)
                        return {
                            api: client,
                            async close() {
                                socket.close()
                            }
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

function createMultiApiTestFactory() {
    const factory: TestFactory<MultiApiOptions> = (description, test?) => {
        it(description, test && (async () => {
            const application = createTestApplication()
            const server = await createHttpServer(application, {
                secretKey: 'bla'
            })

            await server.start()
            const sockets: SocketIOClient.Socket[] = []
            try {
                await test({
                    createSession: async (options) => {
                        if (options.type === 'http') {
                            return {
                                api: await createSupertestApi(server.app),
                                async close() {

                                }
                            }
                        } else if (options.type === 'websocket') {
                            const socket = io('http://localhost:3000', { forceNew: true })
                            sockets.push(socket)

                            const client = await createStorexHubSocketClient(socket, options)
                            return {
                                api: client,
                                async close() {
                                    socket.close()
                                }
                            }
                        } else {
                            throw new Error(`Cannot create API of unknown type: ${options.type}`)
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

export function createApiTestSuite(description: string, suite: TestSuite<ApplicationApiOptions, false>) {
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

export function createMultiApiTestSuite(description: string, suite: TestSuite<MultiApiOptions>) {
    describe(description, () => {
        suite({ it: createMultiApiTestFactory() })
    })
}
