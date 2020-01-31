import { AppSchema } from './types/apps';

export interface StorexHubApi_v0 {
    registerApp(options: RegisterAppOptions_v0): Promise<RegisterAppResult_v0>
    identifyApp(options: IdentifyAppOptions_v0): Promise<IdentifyAppResult_v0>
    getSessionInfo(): Promise<GetSessionInfoResult_v0>
    // unidentifyApp() : Promise<void>

    executeOperation(options: { operation: any[] }): Promise<{ result: any }>

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
    type: 'sync'
    path: string
}

export const STOREX_HUB_API_v0: { [MethodName in keyof StorexHubApi_v0]: MethodDescription } = {
    registerApp: {
        type: 'sync',
        path: '/app/register',
    },
    identifyApp: {
        type: 'sync',
        path: '/app/identify',
    },
    getSessionInfo: {
        type: 'sync',
        path: '/session',
    },
    executeOperation: {
        type: 'sync',
        path: '/storage/operation',
    },
    updateSchema: {
        type: 'sync',
        path: '/schema/update',
    },
}
