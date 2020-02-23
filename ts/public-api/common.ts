export type RemoteSubscriptionRequest_v0 = RemoteStorageChangeSubscriptionRequest_v0
export interface RemoteStorageChangeSubscriptionRequest_v0 {
    type: 'storage-change'
    app: string
    collections?: string[]
}
