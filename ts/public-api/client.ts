import { RemoteSubscriptionRequest_v0 } from "./common"

export interface StorexHubCallbacks_v0 {
    handleRemoteOperation?(options: HandleRemoteOperationOptions_v0): Promise<HandleRemoteOperationResult_v0>
    handleEvent?(options: HandleEventOptions_v0): Promise<HandleEventResult_v0>
    handleSubscription?(options: HandleSubscriptionOptions_v0): Promise<HandleSubscriptionResult_v0>
}

export interface HandleRemoteOperationOptions_v0 {
    operation: any[]
}

export interface HandleRemoteOperationResult_v0 {
    result: any
}

export interface HandleEventOptions_v0 {
    event: ClientEvent
}

export type ClientEvent = RemoteStorageChangeEvent
export interface RemoteStorageChangeEvent {
    type: 'remote-storage-change'
    app: string
    change: string
}

export type HandleEventResult_v0 = void

export interface HandleSubscriptionOptions_v0 {
    request: RemoteSubscriptionRequest_v0
}

export type HandleSubscriptionResult_v0 = void
