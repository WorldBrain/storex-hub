import { RemoteSubscriptionRequest_v0, ReceivedStorageChangeEvent_v0, AppAvailabilityChangedEvent_v0 } from "./common"

export interface StorexHubCallbacks_v0 {
    handleRemoteOperation?(options: HandleRemoteOperationOptions_v0): Promise<HandleRemoteOperationResult_v0>
    handleEvent?(options: HandleEventOptions_v0): Promise<HandleEventResult_v0>
    handleSubscription?(options: HandleSubscriptionOptions_v0): Promise<HandleSubscriptionResult_v0>
    handleUnsubscription?(options: HandleUnsubscriptionOptions_v0): Promise<HandleUnubscriptionResult_v0>
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

export type ClientEvent = ReceivedStorageChangeEvent_v0 | AppAvailabilityChangedEvent_v0

export type HandleEventResult_v0 = void

export interface HandleSubscriptionOptions_v0 {
    request: RemoteSubscriptionRequest_v0
}

export type HandleSubscriptionResult_v0 = {
    subscriptionId: string
}

export interface HandleUnsubscriptionOptions_v0 {
    subscriptionId: string
}

export type HandleUnubscriptionResult_v0 = void
