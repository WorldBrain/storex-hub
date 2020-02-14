import StorageManager, { OperationBatch } from "@worldbrain/storex";
import { StorageOperationWatcher, ModificationStorageChange, DeletionStorageChange, CreationStorageChange, StorageChange, StorageOperationChangeInfo } from "./types";
import { getObjectPk } from "@worldbrain/storex/lib/utils";

const createObject: StorageOperationWatcher = {
    getInfoBeforeExecution(context) {
        const { operation } = context
        const change: CreationStorageChange<'pre'> = {
            type: 'create',
            collection: operation[1],
            values: operation[2],
        }
        return {
            changes: [change]
        }
    },
    getInfoAfterExecution(context) {
        const { operation } = context
        const change: CreationStorageChange<'post'> = {
            type: 'create',
            collection: operation[1],
            pk: context.result.object.id,
            values: operation[2],
        }
        return {
            changes: [change]
        }
    },
}

const updateObject: StorageOperationWatcher = {
    async getInfoBeforeExecution(context) {
        const { operation } = context
        const collection = operation[1]
        const affectedObjects: any[] = await _findObjectsInvolvedInFilteredOperation(operation, context.storageManager)
        const change: ModificationStorageChange<'pre'> = {
            type: 'modify',
            collection: operation[1],
            where: operation[2],
            updates: operation[3],
            pks: affectedObjects.map(object => getObjectPk(object, collection, context.storageManager.registry)),
        }
        return {
            changes: [
                change
            ]
        }
    },
    async getInfoAfterExecution(context) {
        const { operation } = context
        const collection = operation[1]

        const change: ModificationStorageChange<'post'> = {
            type: 'modify',
            collection,
            where: operation[2],
            updates: operation[3],
        };
        return {
            changes: [
                change
            ]
        }
    },
}

const deleteObject: StorageOperationWatcher = {
    async getInfoBeforeExecution(context) {
        const { operation } = context
        const collection = operation[1]
        const affectedObjects: any[] = await _findObjectsInvolvedInFilteredOperation(operation, context.storageManager)
        const change: DeletionStorageChange<'pre'> = {
            type: 'delete',
            collection: operation[1],
            where: operation[2],
            pks: affectedObjects.map(object => getObjectPk(object, collection, context.storageManager.registry)),
        }
        return {
            changes: [change]
        }
    },
    async getInfoAfterExecution(context) {
        const { operation } = context
        const collection = operation[1]

        const change: DeletionStorageChange<'post'> = {
            type: 'delete',
            collection,
            where: operation[2],
        };
        return {
            changes: [
                change
            ]
        }
    },
}

const executeBatch: StorageOperationWatcher = {
    async getInfoBeforeExecution(context) {
        const batch: OperationBatch = context.operation[1]
        const changes: StorageChange<'pre'>[] = []
        const appendInfo = (info: StorageOperationChangeInfo<'pre'>) => {
            changes.push(...info.changes)
        }

        for (const batchOperation of batch) {
            if (batchOperation.operation === 'createObject') {
                appendInfo(await createObject.getInfoBeforeExecution({
                    operation: ['createObject', batchOperation.collection, batchOperation.args],
                    storageManager: context.storageManager,
                }))
            } else if (batchOperation.operation === 'updateObjects') {
                appendInfo(await updateObject.getInfoBeforeExecution({
                    operation: ['updateObjects', batchOperation.collection, batchOperation.where, batchOperation.updates],
                    storageManager: context.storageManager
                }))
            } else if (batchOperation.operation === 'deleteObjects') {
                appendInfo(await deleteObject.getInfoBeforeExecution({
                    operation: ['deleteObjects', batchOperation.collection, batchOperation.where],
                    storageManager: context.storageManager,
                }))
            } else {
                throw new Error(`Change watcher middleware encountered unknown batch operation: ${(batchOperation as any).operation}`)
            }
        }

        return {
            changes
        }
    },
    async getInfoAfterExecution(context) {
        return {
            changes: []
        }
    },
}

async function _findObjectsInvolvedInFilteredOperation(operation: any[], storageManager: StorageManager) {
    const collection = operation[1]
    return storageManager.operation(
        'findObjects', collection, operation[2],
    )
}

export const DEFAULT_OPERATION_WATCHERS = {
    createObject,
    updateObject,
    updateObjects: updateObject,
    deleteObject,
    deleteObjects: deleteObject,
    executeBatch,
}
