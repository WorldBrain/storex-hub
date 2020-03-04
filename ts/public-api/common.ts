import { StorageOperationChangeInfo } from "@worldbrain/storex-middleware-change-watcher/lib/types";

export type RemoteSubscriptionRequest_v0 = RemoteStorageChangeSubscriptionRequest_v0
export interface RemoteStorageChangeSubscriptionRequest_v0 {
    type: 'storage-change'
    app: string
    collections?: string[]
}
export interface StorageChangeEventBase_v0 {
    type: 'storage-change'
    info: StorageOperationChangeInfo<'post'>
}
export type SentStorageChangeEvent_v0 = StorageChangeEventBase_v0
export interface ReceivedStorageChangeEvent_v0 extends StorageChangeEventBase_v0 {
    app: string
}
