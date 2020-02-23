import createResolvable, { Resolvable } from '@josephg/resolvable'
import expect = require("expect");
import StorageManager from "@worldbrain/storex";
import { DexieStorageBackend } from '@worldbrain/storex-backend-dexie'
import { ChangeWatchMiddleware } from '@worldbrain/storex-middleware-change-watcher';
import inMemory from '@worldbrain/storex-backend-dexie/lib/in-memory'
import { createMultiApiTestSuite, TestSetup, MultiApiOptions } from "./index.tests";
import * as api from "../../public-api";

export default createMultiApiTestSuite('Remote apps', ({ it }) => {
    it('should be able to proxy operations into a remote app', async ({ application }) => {
        const operations: any[] = []
        const memex = await application.api({
            type: 'websocket',
            callbacks: {
                handleRemoteOperation: async (options) => {
                    operations.push(options.operation)
                    return { result: ['foo', 'bla'] }
                }
            }
        })
        await memex.registerApp({ name: 'memex', identify: true, remote: true })

        const backupApp = await application.api({ type: 'http' })
        await backupApp.registerApp({ name: 'backup' })
        const response = await backupApp.executeRemoteOperation({
            app: 'memex',
            operation: ['findObjects', 'pages', { url: 'foo.com/bar' }]
        })
        expect(operations).toEqual([
            ['findObjects', 'pages', { url: 'foo.com/bar' }]
        ])
        expect(response).toEqual({
            status: 'success',
            result: {
                result: ['foo', 'bla']
            }
        })
    })

    async function setupChangeEventTest(application: TestSetup<MultiApiOptions, true>['application']) {
        const collectionsToWatch = new Set<string>()

        const backend = new DexieStorageBackend({ dbName: 'memex', idbImplementation: inMemory() })
        const memexStorageManager = new StorageManager({ backend })
        memexStorageManager.registry.registerCollections({
            tags: {
                version: new Date(),
                fields: {
                    name: { type: 'string' },
                    url: { type: 'string' }
                },
                indices: [
                    { field: ['name', 'url'], pk: true }
                ],
            }
        })

        let subscriptionCount = 0
        let memexSubscriptions: { [id: string]: api.RemoteStorageChangeSubscriptionRequest_v0 } = {}
        const memex = await application.api({
            type: 'websocket',
            callbacks: {
                handleSubscription: async ({ request }) => {
                    const subscriptionId = (subscriptionCount++).toString()
                    memexSubscriptions[subscriptionId] = request
                    if (request.type === 'storage-change') {
                        for (const collection of request.collections || []) {
                            collectionsToWatch.add(collection)
                        }
                    }

                    return { subscriptionId }
                },
                handleUnsubscription: async ({ subscriptionId }) => {
                    delete memexSubscriptions[subscriptionId]
                }
            }
        })
        await memex.registerApp({ name: 'memex', identify: true, remote: true })

        const changeWatchMiddleware = new ChangeWatchMiddleware({
            storageManager: memexStorageManager,
            shouldWatchCollection: collection => collectionsToWatch.has(collection),
            postprocessOperation: async context => {
                await memex.emitEvent({ event: { type: 'storage-change', info: context.info } })
            }
        })
        await memexStorageManager.finishInitialization()
        memexStorageManager.setMiddleware([
            changeWatchMiddleware
        ])

        const events: api.ClientEvent[] = []
        const backupApp = await application.api({
            type: 'websocket',
            callbacks: {
                handleEvent: async (options) => {
                    events.push(options.event)
                }
            }
        })
        await backupApp.registerApp({ name: 'backup' })
        const subscriptionResult = await backupApp.subscribeToRemoveEvent({
            request: {
                type: 'storage-change',
                app: 'memex',
                collections: ['tags'],
            }
        })
        if (subscriptionResult.status !== 'success') {
            throw new Error('Subscription was not successful')
        }

        expect(memexSubscriptions).toEqual({
            '0': {
                type: 'storage-change',
                app: 'memex',
                collections: ['tags'],
            }
        })

        return { memexStorageManager, memexSubscriptions, events, subscriptionResult, backupApp }
    }

    it('should be able to let remote apps signal changes to their local storage', async ({ application }) => {
        const { memexStorageManager, events } = await setupChangeEventTest(application)

        await memexStorageManager.collection('tags').createObject({
            url: 'foo.com/test',
            name: 'bla'
        })

        expect(events).toEqual([
            {
                type: "storage-change",
                info: {
                    changes: [
                        {
                            type: "create",
                            collection: "tags",
                            values: {
                                name: "bla",
                                url: "foo.com/test",
                            },
                        },
                    ],
                },
            },
        ])
    })

    it('should be able to let remote apps signal changes to their local storage and unsubscribe from events', async ({ application }) => {
        const { memexStorageManager, memexSubscriptions, events, backupApp, subscriptionResult } = await setupChangeEventTest(application)

        await memexStorageManager.collection('tags').createObject({
            url: 'foo.com/test',
            name: 'bla'
        })

        await backupApp.unsubscribeFromRemoveEvent({ subscriptionId: subscriptionResult.subscriptionId })
        expect(memexSubscriptions).toEqual({})

        await memexStorageManager.collection('tags').createObject({
            url: 'foo.com/test',
            name: 'blub'
        })

        expect(events).toEqual([
            {
                type: "storage-change",
                info: {
                    changes: [
                        {
                            type: "create",
                            collection: "tags",
                            values: {
                                name: "bla",
                                url: "foo.com/test",
                            },
                        },
                    ],
                },
            }
        ])
    })
})
