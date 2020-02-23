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

                await remoteSession.handleSubscription?.({ request })
                const handler = (event: ClientEvent) => {
                    options?.callbacks?.handleEvent?.({ event })
                }
                appEvents.on(request.type, handler)
                return { status: 'success' }
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
