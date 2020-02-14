export type StorageChange<WithPk extends boolean> = CreationStorageChange<WithPk> | ModificationStorageChange | DeletionStorageChange

export type StorageChangePk = string | number | { [key: string]: any }

export interface StorageChangeBase {
    collection: string
}

export type CreationStorageChange<WithPk extends boolean> = StorageChangeBase & {
    type: 'create'
    values: { [key: string]: any }
} & (WithPk extends true ? { pk: StorageChangePk } : {})

export interface ModificationStorageChange extends StorageChangeBase {
    type: 'modify'
    updates: { [key: string]: any }
    pks: StorageChangePk[]
}

export interface DeletionStorageChange {
    type: 'delete'
    pks: StorageChangePk[]
}

export interface StorageOperationChangeInfo<WithPk extends boolean> {
    changes: StorageChange<WithPk>[]
}

export interface StorageOperationWatcher {
    getInfoBeforeExecution(context: { operation: any[] }): StorageOperationChangeInfo<false>
    getInfoAfterExecution(context: { operation: any[], result: any }): StorageOperationChangeInfo<true>
}
