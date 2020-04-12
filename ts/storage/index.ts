import StorageManager, { StorageBackend } from "@worldbrain/storex";
import { AppSchema } from "@worldbrain/storex-hub-interfaces/lib/apps";
import { SystemStorageModules, Storage } from "./types";
import { AppStorage } from "./modules/apps";
import { registerModuleMapCollections } from "@worldbrain/storex-pattern-modules";
import { PluginManagementStorage } from "../plugins/storage";

export async function createStorage(options: { createBackend: () => StorageBackend, appSchemas?: Array<AppSchema> }): Promise<Storage> {
    const storageManager = new StorageManager({ backend: options.createBackend() })
    const systemModules: SystemStorageModules = {
        apps: new AppStorage({ storageManager }),
        plugins: new PluginManagementStorage({ storageManager }),
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
