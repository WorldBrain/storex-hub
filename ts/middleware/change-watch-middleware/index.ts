import StorageManager, { CollectionDefinition } from "@worldbrain/storex";
import { StorageMiddlewareContext, StorageMiddleware } from "@worldbrain/storex/lib/types/middleware";
import { StorageChange, StorageOperationChangeInfo, StorageOperationWatcher } from "./types";
import { DEFAULT_OPERATION_WATCHERS } from "./operation-watchers";

export interface ChangeWatchMiddlewareSettings {
    shouldWatchCollection(collection: string): boolean
    operationWatchers?: { [name: string]: StorageOperationWatcher }
    getCollectionDefinition?(collection: string): CollectionDefinition
    preprocessOperation?(operation: any[], info: StorageOperationChangeInfo<false>): void | Promise<void>
    postprocessOperation?(operation: any[], info: StorageOperationChangeInfo<true>): void | Promise<void>
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
        const executeNext = () => context.next.process({ operation: context.operation })
        if (!this.enabled) {
            return executeNext()
        }

        const watcher = this.operationWatchers[context.operation[0]]
        if (!watcher) {
            return executeNext()
        }

        if (this.options.preprocessOperation) {
            const preInfo = watcher.getInfoBeforeExecution(context)
            await this.options.preprocessOperation([...context.operation], preInfo)
        }
        watcher.modifyOperation?.(context.operation)
        const result = await executeNext()
        return result
    }
}
