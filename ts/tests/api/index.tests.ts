import tempy from 'tempy'
import del from 'del'
import Koa from 'koa'
import supertest from 'supertest'
import { TypeORMStorageBackend } from '@worldbrain/storex-backend-typeorm'
import { DexieStorageBackend } from '@worldbrain/storex-backend-dexie'
import inMemory from '@worldbrain/storex-backend-dexie/lib/in-memory'
import { StorageBackend } from '@worldbrain/storex';
import io from 'socket.io-client'
import { Application, ApplicationApiOptions, ApplicationOptions } from "../../application";
import { DevelopmentAccessTokenManager } from "../../access-tokens";
import { sequentialTokenGenerator } from "../../access-tokens.tests";
import { createHttpServer } from '../../server';
import { StorexHubApi_v0, StorexHubCallbacks_v0 } from '../../public-api';
import { createStorexHubClient, createStorexHubSocketClient } from '../../client';

export type TestSetup<ApiOptions = never, OptionsRequired extends boolean = true, Session = TestSession> = OptionsRequired extends true
    ? { createSession(options: ApiOptions): Promise<Session> }
    : { createSession(options?: ApiOptions): Promise<Session> }
export interface TestSession {
    api: StorexHubApi_v0
    close(): Promise<void>
}
export interface WebSocketTestSession extends TestSession {
    socket: SocketIOClient.Socket
}

export type MultiApiOptions = { type: 'websocket' | 'http' } & { callbacks?: StorexHubCallbacks_v0 }
export type TestFactory<ApiOptions = never, OptionsRequired extends boolean = true, Session = TestSession> =
    (description: string, test?: (setup: TestSetup<ApiOptions, OptionsRequired, Session>) => void | Promise<void>) => void
export type TestSuite<ApiOptions = never, OptionsRequired extends boolean = true, Session = TestSession> =
    (options: { it: TestFactory<ApiOptions, OptionsRequired, Session> }) => void
type TestApplicationStorageBackend = 'dexie' | 'typeorm'

type TestSuiteType = 'direct.dexie' | 'http.dexie' | 'websocket.dexie' | 'websocket.sqlite'
interface TestSuitePreferences {
    enabled: { [Type in TestSuiteType]: boolean }
}

let storageBackendsCreated = 0

export async function withTestApplication(body: (appliication: Application) => Promise<void>, options?: { storageBackend: TestApplicationStorageBackend }) {
    global['navigator'] = { userAgent: 'memory' } // Dexie checks this even if it doesn't exist

    let applicationDependencies: ApplicationOptions
    let cleanup: (() => Promise<void>) | undefined
    if (options?.storageBackend === 'typeorm') {
        const dbFilePath = tempy.file({ extension: 'storex-hub-test.sqlite' })
        const createStorageBackend = () => new TypeORMStorageBackend({
            connectionOptions: {
                type: 'sqlite',
                database: dbFilePath,
                name: `connection-${++storageBackendsCreated}`,
            },
        })
        const closeStorageBackend = async (storageBackend: StorageBackend) => {
            await (storageBackend as TypeORMStorageBackend).connection?.close?.()
        }
        cleanup = async () => {
            await del(dbFilePath)
        }

        applicationDependencies = {
            accessTokenManager: new DevelopmentAccessTokenManager({ tokenGenerator: sequentialTokenGenerator() }),
            createStorageBackend,
            closeStorageBackend,
        }
    } else {
        const idbImplementation = inMemory()
        const createStorageBackend = () => new DexieStorageBackend({ dbName: 'test', idbImplementation })
        const closeStorageBackend = async (storageBackend: StorageBackend) => {
            await (storageBackend as DexieStorageBackend).dexieInstance.close()
        }
        applicationDependencies = {
            accessTokenManager: new DevelopmentAccessTokenManager({ tokenGenerator: sequentialTokenGenerator() }),
            createStorageBackend,
            closeStorageBackend,
        }
    }

    const application = new Application(applicationDependencies)
    try {
        await body(application)
    } finally {
        await cleanup?.()
    }
}

export function createApiTestFactory() {
    const factory: TestFactory<ApplicationApiOptions, false> = (description, test?) => {
        it(description, test && (async () => {
            await withTestApplication(async application => {
                await test({
                    createSession: async () => {
                        return {
                            api: await application.api(),
                            close: async () => { }
                        }
                    }
                })
            })
        }))
    }
    return factory
}

export function createHttpTestFactory() {
    const factory: TestFactory<ApplicationApiOptions, false> = (description, test?) => {
        it(description, test && (async () => {
            await withTestApplication(async application => {
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

export function createWebsocketTestFactory(options?: { storageBackend: TestApplicationStorageBackend }) {
    const factory: TestFactory<ApplicationApiOptions, false, WebSocketTestSession> = (description, test?) => {
        it(description, test && (async () => {
            await withTestApplication(async application => {
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
                                socket,
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
            })
        }))
    }
    return factory
}

export function createMultiApiTestFactory() {
    const factory: TestFactory<MultiApiOptions, true> = (description, test?) => {
        it(description, test && (async () => {
            await withTestApplication(async application => {
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
            })
        }))
    }
    return factory
}

export function createApiTestSuite(description: string, suite: TestSuite<ApplicationApiOptions, false>) {
    describe(description, () => {
        const preferences = getTestSuitePreferences()

        if (preferences.enabled['direct.dexie']) {
            describe('Direct invocation', () => {
                suite({ it: createApiTestFactory() })
            })
        }

        if (preferences.enabled['http.dexie']) {
            describe('HTTP API', () => {
                suite({ it: createHttpTestFactory() })
            })
        }

        if (preferences.enabled['websocket.dexie']) {
            describe('WebSocket API', () => {
                suite({ it: createWebsocketTestFactory() })
            })
        }

        if (preferences.enabled['websocket.sqlite']) {
            describe('WebSocket API with SQLite', () => {
                suite({ it: createWebsocketTestFactory({ storageBackend: 'typeorm' }) })
            })
        }
    })
}

export function createMultiApiTestSuite(description: string, suite: TestSuite<MultiApiOptions>) {
    describe(description, () => {
        suite({ it: createMultiApiTestFactory() })
    })
}

export function getTestSuitePreferences(): TestSuitePreferences {
    const suitePrefString = process.env.STOREX_HUB_TEST_SUITES
    const defaultEnabled = !suitePrefString || suitePrefString === 'all'
    const preferences: TestSuitePreferences = {
        enabled: {
            'direct.dexie': defaultEnabled,
            'http.dexie': defaultEnabled,
            'websocket.dexie': defaultEnabled,
            'websocket.sqlite': defaultEnabled
        }
    }

    if (suitePrefString) {
        for (const type of suitePrefString.split(',')) {
            if (!(type in preferences.enabled)) {
                throw new Error(`Invalid STOREX_HUB_TEST_SUITES environment variable: ${suitePrefString}`)
            }
            preferences.enabled[type] = true
        }
    }

    return preferences

}
