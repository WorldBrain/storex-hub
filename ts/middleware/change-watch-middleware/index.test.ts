import cloneDeep from 'lodash/cloneDeep'
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

        const expectedPreInfo: StorageOperationChangeInfo<'pre'> = {
            changes: [
                { type: 'create', collection: 'user', values: creation.objectValues }
            ]
        }
        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['createObject', 'user', creation.objectValues],
                info: expectedPreInfo
            }
        ])
        const expectedPostInfo: StorageOperationChangeInfo<'post'> = {
            changes: [
                { type: 'create', collection: 'user', pk: creation.object.id, values: creation.objectValues }
            ]
        }
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['createObject', 'user', creation.objectValues],
                info: expectedPostInfo
            }
        ])

        await verifiyTestCreate(storageManager, creation)
    })

    it('should correctly report creations with manual IDs', async () => {
        const { storageManager, popProcessedOperations } = await setupTest()
        const creation = await executeTestCreate(storageManager, { id: 5 })

        const expectedPreInfo: StorageOperationChangeInfo<'pre'> = {
            changes: [
                { type: 'create', collection: 'user', values: { ...creation.objectValues, id: 5 } }
            ]
        }
        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['createObject', 'user', { ...creation.objectValues, id: 5 }],
                info: expectedPreInfo
            }
        ])
        const expectedPostInfo: StorageOperationChangeInfo<'post'> = {
            changes: [
                { type: 'create', collection: 'user', pk: creation.object.id, values: { ...creation.objectValues, id: 5 } }
            ]
        }
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['createObject', 'user', { ...creation.objectValues, id: 5 }],
                info: expectedPostInfo
            }
        ])

        await verifiyTestCreate(storageManager, creation)
    })

    it('should correctly report modifications by updateObject filtered by PK', async () => {
        const { storageManager, popProcessedOperations } = await setupTest()
        const { object1, object2 } = await insertTestObjects({ storageManager, popProcessedOperations })

        await storageManager.operation('updateObject', 'user', { id: object1.id }, { displayName: 'Jon' })

        const expectedPreInfo: StorageOperationChangeInfo<'pre'> = {
            changes: [
                {
                    type: 'modify', collection: 'user',
                    where: { id: object1.id },
                    updates: { displayName: 'Jon' },
                    pks: [object1.id]
                },
            ]
        }
        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['updateObject', 'user', { id: object1.id }, { displayName: 'Jon' }],
                info: expectedPreInfo
            }
        ])
        const expectedPostInfo: StorageOperationChangeInfo<'post'> = {
            changes: [
                {
                    type: 'modify', collection: 'user',
                    where: { id: object1.id },
                    updates: { displayName: 'Jon' },
                },
            ]
        }
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['updateObject', 'user', { id: object1.id }, { displayName: 'Jon' }],
                info: expectedPostInfo
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

        const expectedPreInfo: StorageOperationChangeInfo<'pre'> = {
            changes: [
                {
                    type: 'modify', collection: 'user',
                    where: { id: object1.id },
                    updates: { displayName: 'Jon' },
                    pks: [object1.id]
                },
            ]
        }
        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['updateObjects', 'user', { id: object1.id }, { displayName: 'Jon' }],
                info: expectedPreInfo
            }
        ])
        const expectedPostInfo: StorageOperationChangeInfo<'post'> = {
            changes: [
                {
                    type: 'modify', collection: 'user',
                    where: { id: object1.id },
                    updates: { displayName: 'Jon' },
                },
            ]
        }
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['updateObjects', 'user', { id: object1.id }, { displayName: 'Jon' }],
                info: expectedPostInfo
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

        const expectedPreInfo: StorageOperationChangeInfo<'pre'> = {
            changes: [
                {
                    type: 'modify', collection: 'user',
                    where: { displayName: 'Joe' },
                    updates: { displayName: 'Jon' },
                    pks: [object1.id]
                },
            ]
        }
        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['updateObjects', 'user', { displayName: 'Joe' }, { displayName: 'Jon' }],
                info: expectedPreInfo
            }
        ])
        const expectedPostInfo: StorageOperationChangeInfo<'post'> = {
            changes: [
                {
                    type: 'modify', collection: 'user',
                    where: { displayName: 'Joe' },
                    updates: { displayName: 'Jon' },
                },
            ]
        }
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['updateObjects', 'user', { displayName: 'Joe' }, { displayName: 'Jon' }],
                info: expectedPostInfo
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

        const expectedPreInfo: StorageOperationChangeInfo<'pre'> = {
            changes: [
                {
                    type: 'delete', collection: 'user',
                    where: { id: object1.id },
                    pks: [object1.id]
                },
            ]
        }
        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['deleteObject', 'user', { id: object1.id }],
                info: expectedPreInfo
            }
        ])
        const expectedPostInfo: StorageOperationChangeInfo<'post'> = {
            changes: [
                {
                    type: 'delete', collection: 'user',
                    where: { id: object1.id },
                },
            ]
        }
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['deleteObject', 'user', { id: object1.id }],
                info: expectedPostInfo
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

        const expectedPreInfo: StorageOperationChangeInfo<'pre'> = {
            changes: [
                {
                    type: 'delete', collection: 'user',
                    where: { id: object1.id },
                    pks: [object1.id]
                },
            ]
        }
        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['deleteObjects', 'user', { id: object1.id }],
                info: expectedPreInfo
            }
        ])
        const expectedPostInfo: StorageOperationChangeInfo<'post'> = {
            changes: [
                {
                    type: 'delete', collection: 'user',
                    where: { id: object1.id },
                },
            ]
        }
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['deleteObjects', 'user', { id: object1.id }],
                info: expectedPostInfo
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

        const expectedPreInfo: StorageOperationChangeInfo<'pre'> = {
            changes: [
                {
                    type: 'delete', collection: 'user',
                    where: { displayName: 'Joe' },
                    pks: [object1.id]
                },
            ]
        }
        expect(popProcessedOperations('preproccessed')).toEqual([
            {

                operation: ['deleteObjects', 'user', { displayName: 'Joe' }],
                info: expectedPreInfo
            }
        ])
        const expectedPostInfo: StorageOperationChangeInfo<'post'> = {
            changes: [
                {
                    type: 'delete', collection: 'user',
                    where: { displayName: 'Joe' },
                },
            ]
        }
        expect(popProcessedOperations('postproccessed')).toEqual([
            {
                operation: ['deleteObjects', 'user', { displayName: 'Joe' }],
                info: expectedPostInfo
            }
        ])

        expect(await storageManager.collection('user').findObjects({})).toEqual([
            { id: object2.id, displayName: 'Bob' },
        ])
    })

    it('should correctly report changes through batch operations', async () => {
        const { storageManager, popProcessedOperations } = await setupTest()
        const { object1, object2 } = await insertTestObjects({ storageManager, popProcessedOperations })

        const batch = [
            {
                placeholder: 'jane',
                operation: 'createObject',
                collection: 'user',
                args: {
                    displayName: 'Jane'
                }
            },
            { operation: 'updateObjects', collection: 'user', where: { id: object1.id }, updates: { displayName: 'Jack' } },
            { operation: 'deleteObjects', collection: 'user', where: { id: object2.id } },
        ]
        const batchResult = await storageManager.operation('executeBatch', cloneDeep(batch))

        const expectedPreInfo: StorageOperationChangeInfo<'pre'> = {
            changes: [
                { type: 'create', collection: 'user', values: { displayName: 'Jane' } },
                { type: 'modify', collection: 'user', where: batch[1].where!, updates: batch[1].updates!, pks: [object1.id] },
                { type: 'delete', collection: 'user', where: batch[2].where!, pks: [object2.id] },
            ]
        }
        expect(popProcessedOperations('preproccessed')).toEqual([
            {
                operation: ['executeBatch', batch],
                info: expectedPreInfo
            }
        ])
        // expect(popProcessedOperations('postproccessed')).toEqual([
        //     {
        //         operation: ['deleteObjects', 'user', { displayName: 'Joe' }],
        //         info: {
        //             changes: [
        //                 {
        //                     type: 'delete', collection: 'user',
        //                     where: { displayName: 'Joe' },
        //                 },
        //             ]
        //         }
        //     }
        // ])

        expect(await storageManager.collection('user').findObjects({})).toEqual([
            { id: object1.id, displayName: 'Jack' },
            { id: batchResult.info.jane.object.id, displayName: 'Jane' }
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
