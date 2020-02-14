import StorageManager, { CollectionFields, IndexDefinition } from "@worldbrain/storex"
import { DexieStorageBackend } from "@worldbrain/storex-backend-dexie"
import inMemory from "@worldbrain/storex-backend-dexie/lib/in-memory"
import { ChangeWatchMiddlewareSettings, ChangeWatchMiddleware } from "."
import { StorageChange, StorageOperationChangeInfo } from "./types"
import expect = require("expect")

interface ProcessedTestOperations {
    preproccessed: Array<{ operation: any[], info: StorageOperationChangeInfo<false> }>
    postproccessed: Array<{ operation: any[], info: StorageOperationChangeInfo<true> }>
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

    const operations: {
        preproccessed: Array<{ operation: any[], info: StorageOperationChangeInfo<false> }>,
        postproccessed: Array<{ operation: any[], info: StorageOperationChangeInfo<true> }>,
    } = { preproccessed: [], postproccessed: [] }
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

async function executeTestCreate(storageManager: StorageManager) {
    const objectValues = { displayName: 'John Doe' }
    const { object } = await storageManager
        .collection('user')
        .createObject({ ...objectValues })

    return { object, objectValues }
}

async function verifiyTestCreate(storageManager: StorageManager, options: { object: any, objectValues: any }) {
    const objects = await storageManager.collection('user').findObjects({})
    expect(objects).toEqual([
        { id: options.object.id, ...options.objectValues }
    ])
}

async function testCreateWithoutLogging(setup: TestSetup) {
    const creation = await executeTestCreate(setup.storageManager)
    expect(setup.popProcessedOperations('preproccessed')).toEqual([])
    expect(setup.popProcessedOperations('postproccessed')).toEqual([])
    await verifiyTestCreate(setup.storageManager, creation)
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

    it('should correctly report creations with manual IDs'/* , async () => {
        const { storageManager } = await setupTest()
        const { object } = await storageManager
            .collection('user')
            .createObject({ id: 53, displayName: 'John Doe' })

    } */)

    it('should correctly report modifications by updateObject')

    it('should correctly report modifications by updateObjects filtered by PK')

    it('should correctly report modifications by updateObjects filtered by other fields')

    it('should correctly report deletions by updateObject')

    it('should correctly report deletions by updateObjects filtered by PK')

    it('should correctly report deletions by updateObjects filtered by other fields')

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
