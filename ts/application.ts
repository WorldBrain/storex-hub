import uuid from 'uuid/v4'
import { StorageBackend } from "@worldbrain/storex";
import { StorexHubApi_v0, StorexHubCallbacks_v0, ClientEvent } from "./public-api";
import { Session, SessionEvents } from "./session";
import { AccessTokenManager } from "./access-tokens";
import { Storage } from "./storage/types";
import { createStorage } from "./storage";
import { SingleArgumentOf } from "./types/utils";
import { EventEmitter } from "events";

export interface ApplicationOptions {
    accessTokenManager: AccessTokenManager
    createStorageBackend: () => StorageBackend
    closeStorageBackend: (storageBackend: StorageBackend) => Promise<void>
}
export interface ApplicationApiOptions {
    callbacks?: StorexHubCallbacks_v0
}
export class Application {
    private storage: Promise<Storage>
    private remoteSessions: { [identifier: string]: StorexHubCallbacks_v0 } = {}
    private appEvents: { [identifier: string]: EventEmitter } = {}

    constructor(private options: ApplicationOptions) {
        this.storage = createStorage({ createBackend: options.createStorageBackend })
    }

    async setup() {

    }

    async api(options?: ApplicationApiOptions): Promise<StorexHubApi_v0> {
        const subscriptions: { [subscriptionId: string]: { unsubscribe: () => Promise<void> } } = {}

        const session = new Session({
            accessTokenManager: this.options.accessTokenManager,
            getStorage: () => this.storage,
            updateStorage: async () => {
                const currentStorage = await this.storage
                const appSchemas = await currentStorage.systemModules.apps.getAppSchemas()
                await this.options.closeStorageBackend(currentStorage.manager.backend);
                this.storage = createStorage({
                    createBackend: this.options.createStorageBackend,
                    appSchemas: appSchemas.map(appSchema => appSchema.schema)
                })
                await this.storage
            },
            executeCallback: async (appIdentifier, methodName, methodOptions) => {
                const remoteSession = this.remoteSessions[appIdentifier]
                if (!remoteSession) {
                    return { status: 'app-not-found' }
                }

                const result = await remoteSession[methodName](methodOptions)
                return { status: 'success', result }
            },
            subscribeToEvent: async ({ request }) => {
                const remoteSession = this.remoteSessions[request.app]
                const appEvents = this.appEvents[request.app]
                if (!remoteSession || !appEvents) {
                    return { status: 'app-not-found' }
                }

                const subscriptionResult = await remoteSession.handleSubscription?.({ request })
                if (!subscriptionResult) {
                    return { status: 'app-not-supported' }
                }

                const handler = (event: ClientEvent) => {
                    options?.callbacks?.handleEvent?.({ event })
                }
                appEvents.addListener(request.type, handler)

                const subscriptionId = uuid()
                subscriptions[subscriptionId] = {
                    async unsubscribe() {
                        appEvents.removeListener(request.type, handler)
                        await remoteSession.handleUnsubscription?.({ subscriptionId: subscriptionResult.subscriptionId })
                    }
                }
                return { status: 'success', subscriptionId }
            },
            unsubscribeFromEvent: async ({ subscriptionId }) => {
                const subscription = subscriptions[subscriptionId]
                if (!subscription) {
                    throw new Error(`Got invalid subscription ID trying to unsubscribe from event`)
                }

                await subscription.unsubscribe()
                delete subscriptions[subscriptionId]
            },
            emitEvent: async ({ event }) => {
                if (!session.identifiedApp) {
                    throw new Error('Cannot emit event if not identified')
                }

                const appEvents = this.appEvents[session.identifiedApp.identifier]
                if (!appEvents) {
                    throw new Error(`App ${session.identifiedApp.identifier} is not a remote app`)
                }

                appEvents.emit(event.type, event)
            },
            destroy: async () => {

            }
        })
        session.events.once('appIdentified', (event: SingleArgumentOf<SessionEvents['appIdentified']>) => {
            if (event.remote && options?.callbacks) {
                this.remoteSessions[event.identifier] = options.callbacks
                this.appEvents[event.identifier] = new EventEmitter()
            }
        })
        return session
    }
}
