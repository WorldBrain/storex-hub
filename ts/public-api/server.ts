import { AppSchema } from '../types/apps';
import { StorageOperationChangeInfo } from '@worldbrain/storex-middleware-change-watcher/lib/types';
import { RemoteSubscriptionRequest_v0 } from './common';

export interface StorexHubApi_v0 {
    registerApp(options: RegisterAppOptions_v0): Promise<RegisterAppResult_v0>
    identifyApp(options: IdentifyAppOptions_v0): Promise<IdentifyAppResult_v0>
    getSessionInfo(): Promise<GetSessionInfoResult_v0>
    // unidentifyApp() : Promise<void>

    executeOperation(options: { operation: any[] }): Promise<{ result: any }>

    executeRemoteOperation(options: ExecuteRemoteOperationOptions_v0): Promise<ExecuteRemoteOperationResult_v0>
    subscribeToRemoveEvent(options: SubscribeToRemoveEventOptions_v0): Promise<SubscribeToRemoveEventResult_v0>
    emitEvent(options: EmitEventOptions_v0): Promise<EmitEventResult_v0>

    // requestPriviliges(options : {  }) : Promise<{}>
    // listPrivileges() : Promise<{}>

    updateSchema(options: UpdateSchemaOptions_v0): Promise<UpdateSchemaResult_v0>
    // describeSchema() : Promise<{}> // In terms of RDF
    // updateAccessRules() : Promise<{}>

    // startMigration() : Promise<{}>
    // getMigrationStatus() : Promise<{}>

    // exportData() : Promise<{}>
    // importData(source : string, options : { mode : 'merge' | 'overwrite' }) : Promise<{}>

    // storeSecret() : Promise<{}>
    // getSecret() : Promise<{}>
    // deleteSecret() : Promise<{}>

    // storeApplicationConfig() : Promise<{}>
    // getApplicationConfig() : Promise<{}>
}

export interface RegisterAppOptions_v0 {
    name: string
    remote?: boolean
    identify?: boolean
}

export type RegisterAppResult_v0 = { success: false, errorCode: RegisterAppError_v0, errorText: string } | { success: true, accessToken: string }

export enum RegisterAppError_v0 {
    APP_ALREADY_EXISTS = 1
}

export interface IdentifyAppOptions_v0 {
    name: string
    accessToken: string
}

export type IdentifyAppResult_v0 = { success: true } | { success: false, errorCode: IdentifyAppError_v0, errorText: string }

export enum IdentifyAppError_v0 {
    INVALID_ACCESS_TOKEN = 1,
    DUPLICATE_IDENTFICATION = 2
}

export type GetSessionInfoResult_v0 = {
    success: true,
    appIdentifier?: string
}

export interface ExecuteRemoteOperationOptions_v0 {
    app: string
    operation: any[]
}
export type ExecuteRemoteOperationResult_v0 =
    { status: 'app-not-found' } |
    { status: 'app-not-supported' } |
    { status: 'success', result: any }

export interface SubscribeToRemoveEventOptions_v0 {
    request: RemoteSubscriptionRequest_v0
}
export type SubscribeToRemoveEventResult_v0 =
    { status: 'app-not-found' } |
    { status: 'app-not-supported' } |
    { status: 'success' }

export interface EmitEventOptions_v0 {
    event: EmittableEvent_v0
}
export type EmitEventResult_v0 = void

export type EmittableEvent_v0 = StorageChangeEvent_v0
export interface StorageChangeEvent_v0 {
    type: 'storage-change'
    info: StorageOperationChangeInfo<'post'>
}

export interface UpdateSchemaOptions_v0 {
    schema: AppSchema
}

export type UpdateSchemaResult_v0 = { success: true } | { success: false, errorCode: UpdateSchemaError_v0, errorText: string }

export enum UpdateSchemaError_v0 {
    BAD_REQUEST = 1,
    NOT_ALLOWED = 2,
    SCHEMA_NOT_ALLOWED = 3,
}

export type MethodDescription = SyncMethodDescription
export interface SyncMethodDescription {
    path: string
}

export const STOREX_HUB_API_v0: { [MethodName in keyof StorexHubApi_v0]: MethodDescription } = {
    registerApp: {
        path: '/app/register',
    },
    identifyApp: {
        path: '/app/identify',
    },
    getSessionInfo: {
        path: '/session',
    },
    executeOperation: {
        path: '/storage/operation',
    },
    updateSchema: {
        path: '/schema/update',
    },
    executeRemoteOperation: {
        path: '/remote/operation'
    },
    subscribeToRemoveEvent: {
        path: '/remote/event/subscribe'
    },
    emitEvent: {
        path: '/event/emit'
    }
}
