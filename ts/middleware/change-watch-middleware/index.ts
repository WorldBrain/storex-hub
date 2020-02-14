import cloneDeep from 'lodash/cloneDeep'
import StorageManager, { CollectionDefinition } from "@worldbrain/storex";
import { StorageMiddlewareContext, StorageMiddleware } from "@worldbrain/storex/lib/types/middleware";
import { StorageChange, StorageOperationChangeInfo, StorageOperationWatcher } from "./types";
import { DEFAULT_OPERATION_WATCHERS } from "./operation-watchers";

export interface ChangeWatchMiddlewareSettings {
    shouldWatchCollection(collection: string): boolean
    operationWatchers?: { [name: string]: StorageOperationWatcher }
    getCollectionDefinition?(collection: string): CollectionDefinition
    preprocessOperation?(operation: any[], info: StorageOperationChangeInfo<'pre'>): void | Promise<void>
    postprocessOperation?(operation: any[], info: StorageOperationChangeInfo<'post'>): void | Promise<void>
}
export class ChangeWatchMiddleware implements StorageMiddleware {
    enabled = true

    getCollectionDefinition: (collection: string) => CollectionDefinition
    operationWatchers: { [name: string]: StorageOperationWatcher }

    constructor(private options: ChangeWatchMiddlewareSettings & {
        storageManager: StorageManager
    }) {
        this.getCollectionDefinition = options.getCollectionDefinition ??
            ((collection) => options.storageManager.registry.collections[collection])
        this.operationWatchers = options.operationWatchers ?? DEFAULT_OPERATION_WATCHERS
    }

    async process(context: StorageMiddlewareContext) {
        const executeNext = () => context.next.process({ operation: cloneDeep(context.operation) })
        if (!this.enabled) {
            return executeNext()
        }

        const watcher = this.operationWatchers[context.operation[0]]
        if (!watcher) {
            return executeNext()
        }

        const originalOperation = cloneDeep(context.operation)
        if (this.options.preprocessOperation) {
            const info = await watcher.getInfoBeforeExecution({
                operation: originalOperation,
                storageManager: this.options.storageManager
            })
            await this.options.preprocessOperation(originalOperation, info)
        }
        const result = await executeNext()
        if (this.options.postprocessOperation) {
            const info = await watcher.getInfoAfterExecution({
                operation: originalOperation,
                result,
                storageManager: this.options.storageManager
            })
            await this.options.postprocessOperation(originalOperation, info)
        }
        return result
    }
}
