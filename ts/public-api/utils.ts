import { RemoteSubscriptionRequest_v0 } from "./common";
import { SubscriptionRequest_v0 } from "./server";

const REMOTE_EVENT_TYPES: { [event in RemoteSubscriptionRequest_v0['type']]: true } = {
    'storage-change': true
}

export function isRemoteSubscriptionRequest(request: SubscriptionRequest_v0): request is RemoteSubscriptionRequest_v0 {
    return !!REMOTE_EVENT_TYPES[request.type]
}
