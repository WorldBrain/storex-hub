import { StorageBackend } from "@worldbrain/storex";
import { StorexHubApi_v0, StorexHubCallbacks_v0 } from "./public-api";
import { Session, SessionEvents } from "./session";
import { AccessTokenManager } from "./access-tokens";
import { Storage } from "./storage/types";
import { createStorage } from "./storage";
import { SingleArgumentOf } from "./types/utils";

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
                    throw new Error(`Cannot find remote app: ${appIdentifier}`)
                }

                return remoteSession[methodName](methodOptions)
            },
        })
        session.events.once('appIdentified', (event: SingleArgumentOf<SessionEvents['appIdentified']>) => {
            if (event.remote && options?.callbacks) {
                this.remoteSessions[event.identifier] = options.callbacks
            }
        })
        return session
    }
}
