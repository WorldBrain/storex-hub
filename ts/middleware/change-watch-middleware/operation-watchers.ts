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
    getInfoAfterExecution(context: { operation: any[], result: any }) {
        return {
            changes: [
                {
                    type: 'create',
                    collection: context.operation[1],
                    pk: context.result.object.id,
                    values: context.operation[2],
                }
            ]
        }
    },
}

export const DEFAULT_OPERATION_WATCHERS = {
    createObject
}
