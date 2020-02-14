import StorageManager from "@worldbrain/storex";
import { StorageOperationWatcher, ModificationStorageChange, DeletionStorageChange, CreationStorageChange } from "./types";
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
        };
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
        };
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
}
