import { StorageOperationWatcher } from "./types";

const createObject: StorageOperationWatcher = {
    getInfoBeforeExecution(context: { operation: any[] }) {
        return {
            changes: [
                {
                    type: 'create',
                    collection: context.operation[1],
                    values: context.operation[2],
                }
            ]
        }
    },
    getInfoAfterExecution(context: { operation: any[] }) {
        return { changes: [] }
    },

    // temporary hack until bug is resolved
    modifyOperation(operation) {
        operation[2] = { ...operation[2] }
    }
}

export const DEFAULT_OPERATION_WATCHERS = {
    createObject
}
