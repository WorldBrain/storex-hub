import createResolvable, { Resolvable } from '@josephg/resolvable'
import expect = require("expect");
import StorageManager from "@worldbrain/storex";
import { DexieStorageBackend } from '@worldbrain/storex-backend-dexie'
import { ChangeWatchMiddleware } from '@worldbrain/storex-middleware-change-watcher';
import inMemory from '@worldbrain/storex-backend-dexie/lib/in-memory'
import { createMultiApiTestSuite } from "./index.tests";
import { ClientEvent } from "../../public-api";

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
            result: ['foo', 'bla']
        })
    })

    it('should be able to let remote apps signal changes to their local storage', async ({ application }) => {
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

        const memex = await application.api({
            type: 'websocket',
            callbacks: {
                handleSubscription: async ({ request }) => {
                    if (request.type === 'storage-change') {
                        for (const collection of request.collections || []) {
                            collectionsToWatch.add(collection)
                        }
                    }
                }
            }
        })
        await memex.registerApp({ name: 'memex', identify: true, remote: true })

        const changeWatchMiddleware = new ChangeWatchMiddleware({
            storageManager: memexStorageManager,
            shouldWatchCollection: collection => collectionsToWatch.has(collection),
            postprocessOperation: (context) => {
                memex.emitEvent({ event: { type: 'storage-change', info: context.info } })
            }
        })
        await memexStorageManager.finishInitialization()
        memexStorageManager.setMiddleware([
            changeWatchMiddleware
        ])

        const events: Resolvable<ClientEvent>[] = [createResolvable()]
        const backupApp = await application.api({
            type: 'websocket',
            callbacks: {
                handleEvent: async (options) => {
                    events.slice(-1)[0]!.resolve(options.event)
                    events.push(createResolvable())
                }
            }
        })
        await backupApp.registerApp({ name: 'backup' })
        await backupApp.subscribeToRemoveEvent({
            request: {
                type: 'storage-change',
                app: 'memex',
                collections: ['tags'],
            }
        })

        await memexStorageManager.collection('tags').createObject({
            url: 'foo.com/test',
            name: 'bla'
        })
        expect(await Promise.all(events)).toEqual([
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
})
