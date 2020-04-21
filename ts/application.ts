import uuid from 'uuid/v4'
import TypedEmitter from 'typed-emitter'
import StorageManager, { StorageBackend } from "@worldbrain/storex";
import { StorexHubApi_v0, StorexHubCallbacks_v0, ClientEvent, RemoteSubscriptionRequest_v0, SubscribeToEventResult_v0, AllStorexHubCallbacks_v0 } from "./public-api";
import { Session, SessionEvents } from "./session";
import { AccessTokenManager } from "./access-tokens";
import { Storage } from "./storage/types";
import { createStorage, createAppStorage } from "./storage";
import { SingleArgumentOf } from "./types/utils";
import { EventEmitter } from "events";
import { isRemoteSubscriptionRequest } from './public-api/utils';
import { PluginManager } from './plugins/manager';

export interface ApplicationOptions {
    accessTokenManager: AccessTokenManager
    createStorageBackend: (options: { appIdentifier: string }) => StorageBackend
    closeStorageBackend: (storageBackend: StorageBackend, options: { appIdentifier: string }) => Promise<void>
}
export interface ApplicationApiOptions {
    callbacks?: AllStorexHubCallbacks_v0
}
export class Application {
    public storage: Promise<Storage>
    public pluginManager: PluginManager
    private appStorageManagers: { [appId: number]: Promise<StorageManager> } = {}

    private remoteSessions: { [identifier: string]: AllStorexHubCallbacks_v0 } = {}
    private appEvents: { [identifier: string]: EventEmitter } = {}
    private events = new EventEmitter() as TypedEmitter<{
        'app-availability-changed': (event: { app: string, availability: boolean }) => void
    }>

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
            }
        })
    }

    async setup() {
        await this.pluginManager.setup((await this.storage).systemModules.plugins)
    }

    async api(options?: ApplicationApiOptions): Promise<StorexHubApi_v0> {
        const subscriptions: { [subscriptionId: string]: { unsubscribe: () => Promise<void> } } = {}
        const registerSubscription = (unsubscribe: () => Promise<void>) => {
            const subscriptionId = uuid()
            subscriptions[subscriptionId] = { unsubscribe }
            return subscriptionId
        }

        const session = new Session({
            accessTokenManager: this.options.accessTokenManager,
            pluginManager: this.pluginManager,
            getStorage: () => this.storage,
            getAppStorage: async (identifiedApp) => {
                const appId = identifiedApp.id
                if (this.appStorageManagers[appId]) {
                    return this.appStorageManagers[appId]
                }

                const appStorage = createAppStorage({
                    storage: await this.storage,
                    storageBackend: this.options.createStorageBackend({
                        appIdentifier: identifiedApp.identifier
                    }),
                    appId: appId as number,
                })
                if (!appStorage) {
                    return null
                }

                this.appStorageManagers[appId] = appStorage
                return appStorage
            },
            updateStorage: async (identifiedApp) => {
                const appStorage = this.appStorageManagers[identifiedApp.id]
                if (!appStorage) {
                    return
                }

                await this.options.closeStorageBackend(appStorage.manager.backend, {
                    appIdentifier: identifiedApp.identifier,
                })
                delete this.appStorageManagers[identifiedApp.id]
            },
            executeCallback: async <MethodName extends keyof AllStorexHubCallbacks_v0>(
                appIdentifier: string,
                methodName: MethodName,
                methodOptions: SingleArgumentOf<AllStorexHubCallbacks_v0[MethodName]>
            ) => {
                const remoteSession = this.remoteSessions[appIdentifier]
                if (!remoteSession) {
                    return { status: 'app-not-found' }
                }

                const method = remoteSession[methodName] as AllStorexHubCallbacks_v0[MethodName]
                const result = await method(methodOptions as any) as any
                return { status: 'success', result }
            },
            subscribeToEvent: async ({ request }) => {
                if (isRemoteSubscriptionRequest(request)) {
                    return subsribeToRemoteEvent(request, {
                        getRemoteSession: app => this.remoteSessions[app],
                        getAppEvents: app => this.appEvents[app],
                        handleEvent: async ({ event }) => options?.callbacks?.handleEvent?.({ event }),
                        registerSubscription
                    })
                }

                if (request.type === 'app-availability-changed') {
                    const handler = (event: { app: string, availability: boolean }) => {
                        return options?.callbacks?.handleEvent?.({
                            event: {
                                type: 'app-availability-changed',
                                ...event,
                            }
                        })
                    }

                    this.events.addListener('app-availability-changed', handler)
                    const subscriptionId = registerSubscription(async () => {
                        this.events.removeListener('app-availability-changed', handler)
                    })
                    return { status: 'success', subscriptionId }
                }

                return { status: 'unsupported-event' }
            },
            unsubscribeFromEvent: async ({ subscriptionId }) => {
                const subscription = subscriptions[subscriptionId]
                if (!subscription) {
                    throw new Error(`Got invalid subscription ID trying to unsubscribe from event`)
                }

                await subscription.unsubscribe()
                delete subscriptions[subscriptionId]
            },
            emitEvent: async ({ event, synchronous }) => {
                if (!session.identifiedApp) {
                    throw new Error('Cannot emit event if not identified')
                }

                const appEvents = this.appEvents[session.identifiedApp.identifier]
                if (!appEvents) {
                    throw new Error(`App ${session.identifiedApp.identifier} is not a remote app`)
                }

                if (synchronous) {
                    await Promise.all(appEvents.listeners(event.type).map(handler => {
                        return handler({ ...event, app: session.identifiedApp!.identifier })
                    }))
                } else {
                    appEvents.emit(event.type, {
                        ...event,
                        app: session.identifiedApp.identifier
                    })
                }
            },
            destroySession: async () => {
                if (session.identifiedApp) {
                    const appEvents = this.appEvents[session.identifiedApp.identifier]
                    if (appEvents) {
                        appEvents.removeAllListeners()
                    }

                    this.events.emit('app-availability-changed', {
                        app: session.identifiedApp.identifier,
                        availability: false,
                    })
                }
            }
        })
        session.events.once('appIdentified', (event: SingleArgumentOf<SessionEvents['appIdentified']>) => {
            if (event.remote && options?.callbacks) {
                this.remoteSessions[event.identifier] = options.callbacks
                this.appEvents[event.identifier] = new EventEmitter()
            }
            this.events.emit('app-availability-changed', {
                app: event.identifier,
                availability: true,
            })
        })
        return session
    }
}

export async function subsribeToRemoteEvent(request: RemoteSubscriptionRequest_v0, options: {
    handleEvent: StorexHubCallbacks_v0['handleEvent']
    getRemoteSession: (appIdentifier: string) => StorexHubCallbacks_v0 | null
    getAppEvents: (appIdentifier: string) => EventEmitter | null
    registerSubscription: (unsubscribe: () => Promise<void>) => string
}): Promise<SubscribeToEventResult_v0> {
    const remoteSession = options.getRemoteSession(request.app)
    const appEvents = options.getAppEvents(request.app)
    if (!remoteSession || !appEvents) {
        return { status: 'app-not-found' }
    }

    const subscriptionResult = await remoteSession.handleSubscription?.({ request })
    if (!subscriptionResult) {
        return { status: 'app-not-supported' }
    }

    const handler = (event: ClientEvent) => {
        return options.handleEvent?.({ event })
    }
    appEvents.addListener(request.type, handler)

    const unsubscribe = async () => {
        appEvents.removeListener(request.type, handler)
        await remoteSession.handleUnsubscription?.({ subscriptionId: subscriptionResult.subscriptionId })
    }
    const subscriptionId = await options.registerSubscription(unsubscribe)
    return { status: 'success', subscriptionId }
}
