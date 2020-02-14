import StorageManager, { CollectionFields, IndexDefinition } from "@worldbrain/storex"
import { DexieStorageBackend } from "@worldbrain/storex-backend-dexie"
import inMemory from "@worldbrain/storex-backend-dexie/lib/in-memory"
import { ChangeWatchMiddlewareSettings, ChangeWatchMiddleware } from "."
import { StorageChange, StorageOperationChangeInfo } from "./types"
import expect = require("expect")

interface ProcessedTestOperations {
    preproccessed: Array<{ operation: any[], info: StorageOperationChangeInfo<'pre'> }>
    postproccessed: Array<{ operation: any[], info: StorageOperationChangeInfo<'post'> }>
}
interface TestSetup {
    storageManager: StorageManager
    changeWatchMiddleware: ChangeWatchMiddleware
    popProcessedOperations: <Key extends keyof ProcessedTestOperations>(key: Key) => ProcessedTestOperations[Key]
}

async function setupTest(options?: {
    preprocesses?: boolean
    postprocesses?: boolean
    userFields?: CollectionFields
    userIndices?: IndexDefinition[]
    operationWatchers?: ChangeWatchMiddlewareSettings['operationWatchers']
} & Partial<ChangeWatchMiddlewareSettings>): Promise<TestSetup> {
    const backend = new DexieStorageBackend({
        idbImplementation: inMemory(),
        dbName: 'unittest',
    })
    const storageManager = new StorageManager({ backend: backend as any })
    storageManager.registry.registerCollections({
        user: {
            version: new Date('2019-02-19'),
            fields: options?.userFields ?? {
                displayName: { type: 'string' },
            },
            indices: options?.userIndices,
        },
    })
    await storageManager.finishInitialization()

    const operations: ProcessedTestOperations = { preproccessed: [], postproccessed: [] }
    const changeWatchMiddleware = new ChangeWatchMiddleware({
        storageManager,
        shouldWatchCollection: options?.shouldWatchCollection ?? (() => true),
        operationWatchers: options?.operationWatchers,
        getCollectionDefinition: (collection) => storageManager.registry.collections[collection],
        preprocessOperation: (options?.preprocesses ?? true) ? ((operation, info) => {
            operations.preproccessed.push({ operation, info })
        }) : undefined,
        postprocessOperation: (options?.postprocesses ?? true) ? ((operation, info) => {
            operations.postproccessed.push({ operation, info })
        }) : undefined
    })
    storageManager.setMiddleware([changeWatchMiddleware])
    return {
        storageManager,
        changeWatchMiddleware,
        popProcessedOperations: (type) => {
            const preprocessed = operations[type]
            operations[type] = []
            return preprocessed
        }
    }
}

async function executeTestCreate(storageManager: StorageManager, options?: { id?: number | string }) {
    const objectValues = { displayName: 'John Doe' }
    const { object } = await storageManager
        .collection('user')
        .createObject({ ...objectValues, id: options?.id })

    return { object, objectValues }
}

async function verifiyTestCreate(storageManager: StorageManager, options: { object: any, objectValues: any }) {
    const objects = await storageManager.collection('user').findObjects({})
    expect(objects).toEqual([
        { id: options.object.id, ...options.objectValues }
    ])
}

async function testCreateWithoutLogging(setup: Pick<TestSetup, 'storageManager' | 'popProcessedOperations'>) {
    const creation = await executeTestCreate(setup.storageManager)
    expect(setup.popProcessedOperations('preproccessed')).toEqual([])
    expect(setup.popProcessedOperations('postproccessed')).toEqual([])
    await verifiyTestCreate(setup.storageManager, creation)
}

async function insertTestObjects(setup: Pick<TestSetup, 'storageManager' | 'popProcessedOperations'>) {
    const { object: object1 } = await setup.storageManager
        .collection('user')
        .createObject({ displayName: 'Joe' })
    const { object: object2 } = await setup.storageManager
        .collection('user')
        .createObject({ displayName: 'Bob' })

    setup.popProcessedOperations('preproccessed')
    setup.popProcessedOperations('postproccessed')

    return { object1, object2 }
}

describe('ChangeWatchMiddleware', () => {
    it('should correctly report creations with auto-generated IDs', async () => {
        const { storageManager, popProcessedOperations } = await setupTest()
        const creation = await executeTestCreate(storageManager)

        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['createObject', 'user', creation.objectValues],
                info: {
                    changes: [
                        { type: 'create', collection: 'user', values: creation.objectValues }
                    ]
                }
            }
        ])
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['createObject', 'user', creation.objectValues],
                info: {
                    changes: [
                        { type: 'create', collection: 'user', pk: creation.object.id, values: creation.objectValues }
                    ]
                }
            }
        ])

        await verifiyTestCreate(storageManager, creation)
    })

    it('should correctly report creations with manual IDs', async () => {
        const { storageManager, popProcessedOperations } = await setupTest()
        const creation = await executeTestCreate(storageManager, { id: 5 })

        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['createObject', 'user', { ...creation.objectValues, id: 5 }],
                info: {
                    changes: [
                        { type: 'create', collection: 'user', values: { ...creation.objectValues, id: 5 } }
                    ]
                }
            }
        ])
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['createObject', 'user', { ...creation.objectValues, id: 5 }],
                info: {
                    changes: [
                        { type: 'create', collection: 'user', pk: creation.object.id, values: { ...creation.objectValues, id: 5 } }
                    ]
                }
            }
        ])

        await verifiyTestCreate(storageManager, creation)
    })

    it('should correctly report modifications by updateObject filtered by PK', async () => {
        const { storageManager, popProcessedOperations } = await setupTest()
        const { object1, object2 } = await insertTestObjects({ storageManager, popProcessedOperations })

        await storageManager.operation('updateObject', 'user', { id: object1.id }, { displayName: 'Jon' })

        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['updateObject', 'user', { id: object1.id }, { displayName: 'Jon' }],
                info: {
                    changes: [
                        {
                            type: 'modify', collection: 'user',
                            where: { id: object1.id },
                            updates: { displayName: 'Jon' },
                            pks: [object1.id]
                        },
                    ]
                }
            }
        ])
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['updateObject', 'user', { id: object1.id }, { displayName: 'Jon' }],
                info: {
                    changes: [
                        {
                            type: 'modify', collection: 'user',
                            where: { id: object1.id },
                            updates: { displayName: 'Jon' },
                        },
                    ]
                }
            }
        ])

        expect(await storageManager.collection('user').findObjects({})).toEqual([
            { id: object1.id, displayName: 'Jon' },
            { id: object2.id, displayName: 'Bob' },
        ])
    })

    it('should correctly report modifications by updateObjects filtered by PK', async () => {
        const { storageManager, popProcessedOperations } = await setupTest()
        const { object1, object2 } = await insertTestObjects({ storageManager, popProcessedOperations })

        await storageManager.operation('updateObjects', 'user', { id: object1.id }, { displayName: 'Jon' })

        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['updateObjects', 'user', { id: object1.id }, { displayName: 'Jon' }],
                info: {
                    changes: [
                        {
                            type: 'modify', collection: 'user',
                            where: { id: object1.id },
                            updates: { displayName: 'Jon' },
                            pks: [object1.id]
                        },
                    ]
                }
            }
        ])
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['updateObjects', 'user', { id: object1.id }, { displayName: 'Jon' }],
                info: {
                    changes: [
                        {
                            type: 'modify', collection: 'user',
                            where: { id: object1.id },
                            updates: { displayName: 'Jon' },
                        },
                    ]
                }
            }
        ])

        expect(await storageManager.collection('user').findObjects({})).toEqual([
            { id: object1.id, displayName: 'Jon' },
            { id: object2.id, displayName: 'Bob' },
        ])
    })

    it('should correctly report modifications by updateObjects filtered by other fields', async () => {
        const { storageManager, popProcessedOperations } = await setupTest({ userIndices: [] })
        const { object1, object2 } = await insertTestObjects({ storageManager, popProcessedOperations })

        await storageManager.operation('updateObjects', 'user', { displayName: 'Joe' }, { displayName: 'Jon' })

        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['updateObjects', 'user', { displayName: 'Joe' }, { displayName: 'Jon' }],
                info: {
                    changes: [
                        {
                            type: 'modify', collection: 'user',
                            where: { displayName: 'Joe' },
                            updates: { displayName: 'Jon' },
                            pks: [object1.id]
                        },
                    ]
                }
            }
        ])
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['updateObjects', 'user', { displayName: 'Joe' }, { displayName: 'Jon' }],
                info: {
                    changes: [
                        {
                            type: 'modify', collection: 'user',
                            where: { displayName: 'Joe' },
                            updates: { displayName: 'Jon' },
                        },
                    ]
                }
            }
        ])

        expect(await storageManager.collection('user').findObjects({})).toEqual([
            { id: object1.id, displayName: 'Jon' },
            { id: object2.id, displayName: 'Bob' },
        ])
    })

    it('should correctly report deletions by deleteObject filtered by PK', async () => {
        const { storageManager, popProcessedOperations } = await setupTest()
        const { object1, object2 } = await insertTestObjects({ storageManager, popProcessedOperations })

        await storageManager.operation('deleteObject', 'user', { id: object1.id })

        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['deleteObject', 'user', { id: object1.id }],
                info: {
                    changes: [
                        {
                            type: 'delete', collection: 'user',
                            where: { id: object1.id },
                            pks: [object1.id]
                        },
                    ]
                }
            }
        ])
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['deleteObject', 'user', { id: object1.id }],
                info: {
                    changes: [
                        {
                            type: 'delete', collection: 'user',
                            where: { id: object1.id },
                        },
                    ]
                }
            }
        ])

        expect(await storageManager.collection('user').findObjects({})).toEqual([
            { id: object2.id, displayName: 'Bob' },
        ])
    })

    it('should correctly report deletions by deleteObjects filtered by PK', async () => {
        const { storageManager, popProcessedOperations } = await setupTest()
        const { object1, object2 } = await insertTestObjects({ storageManager, popProcessedOperations })

        await storageManager.operation('deleteObjects', 'user', { id: object1.id })

        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['deleteObjects', 'user', { id: object1.id }],
                info: {
                    changes: [
                        {
                            type: 'delete', collection: 'user',
                            where: { id: object1.id },
                            pks: [object1.id]
                        },
                    ]
                }
            }
        ])
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['deleteObjects', 'user', { id: object1.id }],
                info: {
                    changes: [
                        {
                            type: 'delete', collection: 'user',
                            where: { id: object1.id },
                        },
                    ]
                }
            }
        ])

        expect(await storageManager.collection('user').findObjects({})).toEqual([
            { id: object2.id, displayName: 'Bob' },
        ])
    })

    it('should correctly report deletions by deleteObjects filtered by other fields', async () => {
        const { storageManager, popProcessedOperations } = await setupTest()
        const { object1, object2 } = await insertTestObjects({ storageManager, popProcessedOperations })

        await storageManager.operation('deleteObjects', 'user', { displayName: 'Joe' })

        expect(popProcessedOperations('preproccessed')).toEqual([
            {

                operation: ['deleteObjects', 'user', { displayName: 'Joe' }],
                info: {
                    changes: [
                        {
                            type: 'delete', collection: 'user',
                            where: { displayName: 'Joe' },
                            pks: [object1.id]
                        },
                    ]
                }
            }
        ])
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['deleteObjects', 'user', { displayName: 'Joe' }],
                info: {
                    changes: [
                        {
                            type: 'delete', collection: 'user',
                            where: { displayName: 'Joe' },
                        },
                    ]
                }
            }
        ])

        expect(await storageManager.collection('user').findObjects({})).toEqual([
            { id: object2.id, displayName: 'Bob' },
        ])
    })

    it('should let operations through if not enabled', async () => {
        const setup = await setupTest()
        setup.changeWatchMiddleware.enabled = false

        await testCreateWithoutLogging(setup)
    })

    it('should let operations through for which there are no watchers', async () => {
        const setup = await setupTest({
            operationWatchers: {}
        })

        await testCreateWithoutLogging(setup)
    })

    it('should let operations through if not passed a preprocessor', async () => {
        const setup = await setupTest({
            preprocesses: false,
            postprocesses: false,
        })

        await testCreateWithoutLogging(setup)
    })

    // it('should correctly pass down change information to next middleware')
})
