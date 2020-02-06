export interface StorexHubCallbacks_v0 {
    handleRemoteOperation(options: HandleRemoteOperationOptions_v0): Promise<{ result: any }>
}

export interface HandleRemoteOperationOptions_v0 {
    operation: any[]
}
