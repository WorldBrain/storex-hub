import * as api from "./public-api";
import { CollectionDefinitionMap } from "@worldbrain/storex";
import { AccessTokenManager } from "./access-tokens";
import { Storage } from "./storage/types";
import { AppSchema } from "./types/apps";

export interface SessionOptions {
    accessTokenManager: AccessTokenManager
    getStorage: () => Promise<Storage>
    updateStorage: () => Promise<void>
}
interface IdentifiedApp {
    id: number | string
    identifier: string
}
export class Session implements api.StorexHubApi_v0 {
    private identifiedApp?: IdentifiedApp

    constructor(private options: SessionOptions) {
    }

    async registerApp(options: api.RegisterAppOptions_v0): Promise<api.RegisterAppResult_v0> {
        const storage = await this.options.getStorage()
        const existingApp = await storage.systemModules.apps.getApp(options.name)
        if (existingApp) {
            return { success: false, errorCode: api.RegisterAppError_v0.APP_ALREADY_EXISTS, errorText: 'App already exists' }
        }

        const accessToken = await this.options.accessTokenManager.createToken()
        await storage.systemModules.apps.createApp({ identifier: options.name, accessKeyHash: accessToken.hashedToken })
        if (options.identify) {
            await this.identifyApp({ name: options.name, accessToken: accessToken.plainTextToken })
        }
        return { success: true, accessToken: accessToken.plainTextToken }
    }

    async identifyApp(options: api.IdentifyAppOptions_v0): Promise<api.IdentifyAppResult_v0> {
        const storage = await this.options.getStorage()
        const existingApp = await storage.systemModules.apps.getApp(options.name)
        if (!existingApp) {
            return { success: false, errorCode: api.IdentifyAppError_v0.INVALID_ACCESS_TOKEN, errorText: 'Invalid access token' }
        }
        const valid = await this.options.accessTokenManager.validateToken({ actualHash: existingApp.accessKeyHash, providedToken: options.accessToken })
        if (valid) {
            this.identifiedApp = { identifier: options.name, id: existingApp.id }
            return { success: true }
        } else {
            return { success: false, errorCode: api.IdentifyAppError_v0.INVALID_ACCESS_TOKEN, errorText: 'Invalid access token' }
        }
    }

    async getSessionInfo(): Promise<api.GetSessionInfoResult_v0> {
        return {
            success: true,
            appIdentifier: this.identifiedApp && this.identifiedApp.identifier,
        }
    }

    async executeOperation(options: { operation: any[] }): Promise<{ result: any }> {
        return { result: await (await this.options.getStorage()).manager.operation(options.operation[0], ...options.operation.slice(1)) }
    }

    async updateSchema(options: { schema: AppSchema }): Promise<api.UpdateSchemaResult_v0> {
        if (!this.identifiedApp) {
            return {
                success: false, errorCode: api.UpdateSchemaError_v0.NOT_ALLOWED,
                errorText: `Could not update schema: app not identified`
            }
        }

        const checkResult = await checkAppSchema(options.schema, { identifiedApp: this.identifiedApp })
        if (!checkResult.success) {
            return checkResult
        }

        await (await this.options.getStorage()).systemModules.apps.updateSchema(
            this.identifiedApp.id, options.schema,
        )
        await this.options.updateStorage()
        return { success: true }
    }
}

export async function checkAppSchema(schema: AppSchema, options: { identifiedApp: IdentifiedApp }): Promise<api.UpdateSchemaResult_v0> {
    for (const [collectionName] of Object.entries(schema.collectionDefinitions || {})) {
        const collectionNameMatch = /^([a-zA-Z]+)(?:\:([a-zA-Z]+))?$/.exec(collectionName)
        if (!collectionNameMatch) {
            return {
                success: false, errorCode: api.UpdateSchemaError_v0.BAD_REQUEST,
                errorText: `Cannot create collection with invalid name '${collectionName}'`
            }
        }

        if (!collectionNameMatch[2]) {
            return {
                success: false, errorCode: api.UpdateSchemaError_v0.SCHEMA_NOT_ALLOWED,
                errorText: `Cannot create non-namespaced collection '${collectionName}'`
            }
        }

        if (collectionNameMatch[1] !== options.identifiedApp.identifier) {
            return {
                success: false, errorCode: api.UpdateSchemaError_v0.SCHEMA_NOT_ALLOWED,
                errorText: `Cannot created collection '${collectionNameMatch[2]}' in app namespace '${collectionNameMatch[1]}'`
            }
        }
    }
    return { success: true }
}
