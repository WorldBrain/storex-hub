import { StorageBackend } from "@worldbrain/storex"
import { IdentifiedApp } from "../types"
import { Storage } from "./types"
import { createAppStorage } from "."

export class AppStorages {
    private appStorageManagers: { [appId: number]: Promise<StorageManager> } = {}

    constructor(private options: {
        getStorage: () => Promise<Storage>
        createStorageBackend: (options: { appIdentifier: string }) => StorageBackend
        closeStorageBackend: (storageBackend: StorageBackend, options: { appIdentifier: string }) => Promise<void>
    }) {
    }

    getAppStorage = async (identifiedApp: IdentifiedApp) => {
        const appId = identifiedApp.id
        if (this.appStorageManagers[appId]) {
            return this.appStorageManagers[appId]
        }

        const appStorage = createAppStorage({
            storage: await this.options.getStorage(),
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
    }

    updateStorage = async (identifiedApp: IdentifiedApp) => {
        const appStorage = this.appStorageManagers[identifiedApp.id]
        if (!appStorage) {
            return
        }

        await this.options.closeStorageBackend(appStorage.manager.backend, {
            appIdentifier: identifiedApp.identifier,
        })
        delete this.appStorageManagers[identifiedApp.id]
    }
}
