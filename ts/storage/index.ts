import StorageManager, { StorageBackend } from "@worldbrain/storex";
import { StandardStorageModules, Storage } from "./types";
import { AppStorage } from "./modules/apps";
import { registerModuleMapCollections } from "@worldbrain/storex-pattern-modules";
import { AppSchema } from "../types/apps";

export async function createStorage(options: { createBackend: () => StorageBackend, appSchemas?: Array<AppSchema> }): Promise<Storage> {
    const storageManager = new StorageManager({ backend: options.createBackend() })
    const systemModules: StandardStorageModules = {
        apps: new AppStorage({ storageManager })
    }

    registerModuleMapCollections(storageManager.registry, systemModules as any)
    for (const appSchema of options.appSchemas || []) {
        if (appSchema.collectionDefinitions) {
            storageManager.registry.registerCollections(appSchema.collectionDefinitions)
        }
    }

    await storageManager.finishInitialization()
    await storageManager.backend.migrate()

    const storage: Storage = {
        manager: storageManager,
        systemModules,
    }
    return storage
}
