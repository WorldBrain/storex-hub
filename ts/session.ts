import { EventEmitter } from "events";
import pick from 'lodash/pick'
import omit from 'lodash/omit'
import * as api from "./public-api";
import TypedEmitter from 'typed-emitter'
import { AppSchema } from "@worldbrain/storex-hub-interfaces/lib/apps";
import { AccessTokenManager } from "./access-tokens";
import { Storage } from "./storage/types";
import { PluginManager } from './plugins/manager';
import { IdentifiedApp } from './types';
import { RemoteSessions } from "./remote-sessions";
import { AppStorages } from "./storage/apps";
import { AppEvents } from "./app-events";
import { RecipeManager } from "./recipes";

export interface SessionOptions {
    accessTokenManager: AccessTokenManager
    pluginManager: PluginManager
    appStorages: AppStorages
    remoteSessions: RemoteSessions
    appEvents: AppEvents
    recipes: RecipeManager
    getStorage: () => Promise<Storage>

    destroySession: () => Promise<void>
}
export interface SessionEvents {
    appIdentified: (event: { identifier: string, remote: boolean }) => void
}

export class Session implements api.StorexHubApi_v0 {
    events: TypedEmitter<SessionEvents> = new EventEmitter() as TypedEmitter<SessionEvents>
    identifiedApp?: IdentifiedApp
    destroyed = false

    constructor(private options: SessionOptions) {
    }

    registerApp: api.StorexHubApi_v0['registerApp'] = async (options) => {
        const storage = await this.options.getStorage()
        const existingApp = await storage.systemModules.apps.getApp(options.name)

        const accessToken = await this.options.accessTokenManager.createToken()
        if (!existingApp) {
            await storage.systemModules.apps.createApp({
                identifier: options.name,
                accessKeyHash: accessToken.hashedToken,
                isRemote: options.remote,
            })
        } else {
            await storage.systemModules.apps.addAccessKey({
                appId: existingApp.id,
                hash: accessToken.hashedToken,
            })
        }
        if (options.identify) {
            await this.identifyApp({ name: options.name, accessToken: accessToken.plainTextToken })
        }
        return { status: 'success', accessToken: accessToken.plainTextToken }
    }

    identifyApp: api.StorexHubApi_v0['identifyApp'] = async (options) => {
        const storage = await this.options.getStorage()
        const appInfo = await storage.systemModules.apps.getAppWithAccessKeys({ appIdentifier: options.name })
        if (!appInfo) {
            return { status: 'invalid-access-token' }
        }
        const { app, accessKeys } = appInfo

        let valid = false
        for (const { hash } of accessKeys) {
            valid = await this.options.accessTokenManager.validateToken({ actualHash: hash, providedToken: options.accessToken })
            if (valid) {
                break
            }
        }
        if (!valid) {
            return { status: 'invalid-access-token' }
        }

        this.identifiedApp = { identifier: options.name, id: app.id }
        this.events.emit('appIdentified', { identifier: options.name, remote: !!app.isRemote })
        return { status: 'success' }
    }

    getSessionInfo: api.StorexHubApi_v0['getSessionInfo'] = async () => {
        return {
            status: 'success',
            appIdentifier: this.identifiedApp && this.identifiedApp.identifier,
        }
    }

    executeOperation: api.StorexHubApi_v0['executeOperation'] = async (options) => {
        if (!this.identifiedApp) {
            throw new Error(`Operation executed without app identification`)
        }
        const appStorage = await this.options.appStorages.getAppStorage(this.identifiedApp)
        if (!appStorage) {
            return { status: 'no-schema-found' }
        }

        return { status: 'success', result: await appStorage.operation(options.operation[0], ...options.operation.slice(1)) }
    }

    updateSchema: api.StorexHubApi_v0['updateSchema'] = async (options) => {
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
        await this.options.appStorages.updateStorage(this.identifiedApp)
        return { success: true }
    }

    executeRemoteOperation: api.StorexHubApi_v0['executeRemoteOperation'] = async (options) => {
        if (!this.identifiedApp) {
            return { status: 'not-identified' }
        }

        const response = await this.options.remoteSessions.executeCallback(options.app, 'handleRemoteOperation', {
            sourceApp: this.identifiedApp.identifier,
            operation: options.operation,
        })
        if (response.status === 'success') {
            if (response.result.status === 'not-implemented') {
                return { status: 'app-not-supported' }
            }
            return {
                status: 'success',
                result: response.result.result
            }
        }
        return response
    }

    executeRemoteCall: api.StorexHubApi_v0['executeRemoteCall'] = async (options) => {
        if (!this.identifiedApp) {
            return { status: 'not-identified' }
        }

        const response = await this.options.remoteSessions.executeCallback(options.app, 'handleRemoteCall', {
            call: options.call,
            args: options.args
        })
        if (response.status === 'success') {
            if (response.result.status === 'not-implemented') {
                return { status: 'call-not-found' }
            }
            return response.result
        }

        return response
    }

    subscribeToEvent: api.StorexHubApi_v0['subscribeToEvent'] = async (options) => {
        if (!this.identifiedApp) {
            return { status: 'not-identified' }
        }
        return this.options.appEvents.subscribeAppToEvent(this.identifiedApp, options)
    }

    unsubscribeFromEvent: api.StorexHubApi_v0['unsubscribeFromEvent'] = async (options) => {
        return this.options.appEvents.unsubscribeFromEvent(options)
    }

    emitEvent: api.StorexHubApi_v0['emitEvent'] = async (options) => {
        if (!this.identifiedApp) {
            throw new Error('Cannot emit event if not identified')
        }

        return this.options.appEvents.emitEvent(this.identifiedApp, options)
    }

    destroySession: api.StorexHubApi_v0['destroySession'] = async () => {
        if (!this.destroyed) {
            await this.options.destroySession()
            this.destroyed = true
        }
    }

    describeAppSettings: api.StorexHubApi_v0['describeAppSettings'] = async (options) => {
        if (!this.identifiedApp) {
            return { status: 'not-identified' }
        }

        const storage = await this.options.getStorage()
        const appId = options.app
            ? (await storage.systemModules.apps.getApp(options.app))?.id
            : this.identifiedApp.id as number
        if (!appId) {
            return { status: 'app-not-found' }
        }

        await storage.systemModules.apps.setAppSettingsDescription(appId, options.description)

        return { status: 'success' }
    }

    getAppSettingsDescription: api.StorexHubApi_v0['getAppSettingsDescription'] = async (options) => {
        if (!this.identifiedApp) {
            return { status: 'not-identified' }
        }
        const storage = await this.options.getStorage()
        const appId = options.app
            ? (await storage.systemModules.apps.getApp(options.app))?.id
            : this.identifiedApp.id as number
        if (!appId) {
            return { status: 'app-not-found' }
        }

        const description = await storage.systemModules.apps.getAppSettingsDescription(appId)
        if (!description) {
            return { status: 'has-no-description' }
        }
        return { status: 'success', description }
    }

    getAppSettings: api.StorexHubApi_v0['getAppSettings'] = async (options) => {
        if (!this.identifiedApp) {
            return { status: 'not-identified' }
        }

        const storage = await this.options.getStorage()
        let appId = options.app
            ? (await storage.systemModules.apps.getApp(options.app))?.id
            : this.identifiedApp.id as number
        if (!appId) {
            return { status: 'app-not-found' }
        }

        const existingSettings = await storage.systemModules.apps.getAppSettings(appId)
        const settings = options.keys === 'all'
            ? existingSettings || {}
            : pick(existingSettings || {}, options.keys)

        return { status: 'success', settings }
    }

    setAppSettings: api.StorexHubApi_v0['setAppSettings'] = async (options) => {
        if (!this.identifiedApp) {
            return { status: 'not-identified' }
        }

        const storage = await this.options.getStorage()
        let appId = options.app
            ? (await storage.systemModules.apps.getApp(options.app)).id
            : this.identifiedApp.id as number

        const existingSettings = await storage.systemModules.apps.getAppSettings(appId)
        const newSettings = { ...(existingSettings || {}), ...options.updates }
        await storage.systemModules.apps.setAppSettings(appId, newSettings)

        return { status: 'success' }
    }

    deleteAppSettings: api.StorexHubApi_v0['deleteAppSettings'] = async (options) => {
        if (!this.identifiedApp) {
            return { status: 'not-identified' }
        }

        const storage = await this.options.getStorage()
        let appId = options.app
            ? (await storage.systemModules.apps.getApp(options.app)).id
            : this.identifiedApp.id as number

        const existingSettings = await storage.systemModules.apps.getAppSettings(appId)
        if (!existingSettings) {
            if (options.keys === 'all') {
                return { status: 'success' }
            } else {
                return { status: 'non-existing-keys', keys: options.keys }
            }
        }
        const newSettings = options.keys === 'all' ? {} : omit(existingSettings, options.keys)
        await storage.systemModules.apps.setAppSettings(appId, newSettings)
        await storage.manager.collection('appSettingsObject').findObjects({})

        return { status: 'success' }
    }

    listPlugins: api.StorexHubApi_v0['listPlugins'] = async () => {
        return this.options.pluginManager.listPlugins()
    }

    inspectPlugin: api.StorexHubApi_v0['inspectPlugin'] = async options => {
        return this.options.pluginManager.inspectPlugin(options)
    }

    installPlugin: api.StorexHubApi_v0['installPlugin'] = async options => {
        return this.options.pluginManager.installPlugin(options)
    }

    removePlugin: api.StorexHubApi_v0['removePlugin'] = async options => {
        throw new Error(`Not implementeed`)
    }

    createRecipe: api.StorexHubApi_v0['createRecipe'] = async options => {
        return this.options.recipes.createRecipe(options.recipe)
    }
}

export async function checkAppSchema(schema: AppSchema, options: { identifiedApp: IdentifiedApp }): Promise<api.UpdateSchemaResult_v0> {
    for (const [collectionName] of Object.entries(schema.collectionDefinitions || {})) {
        const collectionNameMatch = /^[a-zA-Z]+$/.exec(collectionName)
        if (!collectionNameMatch) {
            return {
                success: false, errorCode: api.UpdateSchemaError_v0.BAD_REQUEST,
                errorText: `Cannot create collection with invalid name '${collectionName}'`
            }
        }
    }
    return { success: true }
}
