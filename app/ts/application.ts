import { StorageBackend } from "@worldbrain/storex";
import { StorexClientAPI_v0 } from "./public-api";
import { Session } from "./sessions";
import { AccessTokenManager } from "./access-tokens";
import { Storage } from "./storage/types";
import { createStorage } from "./storage";

export interface ApplicationOptions {
    accessTokenManager : AccessTokenManager
    createStorageBackend : () => StorageBackend
    closeStorageBackend : (storageBackend : StorageBackend) => Promise<void>
}
export class Application {
    private storage : Promise<Storage>

    constructor(private options : ApplicationOptions) {
        this.storage = createStorage({ createBackend: options.createStorageBackend })
    }

    async setup() {
        
    }

    async api() : Promise<StorexClientAPI_v0> {
        return new Session({
            accessTokenManager: this.options.accessTokenManager,
            getStorage: () => this.storage,
            updateStorage: async () => {
                const currentStorage = await this.storage
                const appSchemas = await currentStorage.systemModules.apps.getAppSchemas()
                await this.options.closeStorageBackend(currentStorage.manager.backend)
                this.storage = createStorage({
                    createBackend: this.options.createStorageBackend,
                    appSchemas: appSchemas.map(appSchema => appSchema.schema)
                })
                await this.storage
            }
        })
    }
}
