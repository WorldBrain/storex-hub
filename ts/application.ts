import * as fs from 'fs'
import TypedEmitter from 'typed-emitter'
import { StorageBackend } from "@worldbrain/storex";
import { StorexHubApi_v0, StorexHubCallbacks_v0, ClientEvent, RemoteSubscriptionRequest_v0, SubscribeToEventResult_v0, AllStorexHubCallbacks_v0 } from "./public-api";
import { Session, SessionEvents } from "./session";
import { AccessTokenManager } from "./access-tokens";
import { Storage } from "./storage/types";
import { createStorage } from "./storage";
import { SingleArgumentOf } from "./types/utils";
import { EventEmitter } from "events";
import { isRemoteSubscriptionRequest } from './public-api/utils';
import { PluginManager } from './plugins/manager';
import { AppStorages } from './storage/apps';
import { RemoteSessions } from './remote-sessions';
import { AppEvents } from './app-events';

export interface ApplicationOptions {
    accessTokenManager: AccessTokenManager
    createStorageBackend: (options: { appIdentifier: string }) => StorageBackend
    closeStorageBackend: (storageBackend: StorageBackend, options: { appIdentifier: string }) => Promise<void>
    pluginsDir?: string
    fsModule?: typeof fs
}
export interface ApplicationApiOptions {
    callbacks?: AllStorexHubCallbacks_v0
}
export class Application {
    storage: Promise<Storage>
    appStorages: AppStorages
    pluginManager: PluginManager
    remoteSessions: RemoteSessions
    appEvents: AppEvents

    constructor(private options: ApplicationOptions) {
        this.storage = createStorage({
            storageBackend: options.createStorageBackend({
                appIdentifier: '_system'
            })
        })
        this.pluginManager = new PluginManager({
            createApi: async (identifier, options) => {
                const session = await this.api(options as any) as Session
                const app = await (await this.storage).systemModules.apps.getApp(identifier)
                if (app) {
                    session.identifiedApp = { id: app.id, identifier }
                    return session
                }
                await session.registerApp({ name: identifier, identify: true })
                return session
            },
            pluginsDir: this.options.pluginsDir,
            fsModule: options.fsModule,
        })
        this.appStorages = new AppStorages({
            getStorage: () => this.storage,
            createStorageBackend: options.createStorageBackend,
            closeStorageBackend: options.closeStorageBackend
        })
        this.remoteSessions = new RemoteSessions()
        this.appEvents = new AppEvents(this.remoteSessions)
    }

    async setup() {
        await this.pluginManager.setup((await this.storage).systemModules.plugins)
    }

    async api(options?: ApplicationApiOptions): Promise<StorexHubApi_v0> {
        const session = new Session({
            accessTokenManager: this.options.accessTokenManager,
            pluginManager: this.pluginManager,
            appStorages: this.appStorages,
            remoteSessions: this.remoteSessions,
            appEvents: this.appEvents,
            getStorage: () => this.storage,
            destroySession: async () => {
                if (session.identifiedApp) {
                    const appEvents = this.appEvents[session.identifiedApp.identifier]
                    if (appEvents) {
                        appEvents.removeAllListeners()
                    }

                    this.appEvents.cleanupApp(session.identifiedApp)
                    this.remoteSessions.cleanupApp(session.identifiedApp)
                }
            }
        })
        session.events.once('appIdentified', (event: SingleArgumentOf<SessionEvents['appIdentified']>) => {
            if (options?.callbacks) {
                this.remoteSessions.initializeApp({ identifier: event.identifier }, options.callbacks)
                this.appEvents.initializeApp({ identifier: event.identifier })
            }
        })
        return session
    }
}
