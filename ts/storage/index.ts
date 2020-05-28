import StorageManager, { StorageBackend } from "@worldbrain/storex";
import { SystemStorageModules, Storage } from "./types";
import { AppStorage } from "./modules/apps";
import { registerModuleMapCollections } from "@worldbrain/storex-pattern-modules";
import { PluginManagementStorage } from "../plugins/storage";
import { RecipeStorage } from "./modules/recipes";

export async function createStorage(options: { storageBackend: StorageBackend }): Promise<Storage> {
    const storageManager = new StorageManager({ backend: options.storageBackend })
    const systemModules: SystemStorageModules = {
        apps: new AppStorage({ storageManager }),
        plugins: new PluginManagementStorage({ storageManager }),
        recipes: new RecipeStorage({ storageManager })
    }
    registerModuleMapCollections(storageManager.registry, systemModules as any)

    await storageManager.finishInitialization()
    await storageManager.backend.migrate()

    const storage: Storage = {
        manager: storageManager,
        systemModules,
    }
    return storage
}

export async function createAppStorage(options: {
    storage: Storage,
    storageBackend: StorageBackend,
    appId: number
}): Promise<StorageManager | null> {
    const storageManager = new StorageManager({ backend: options.storageBackend })
    const appSchema = await options.storage.systemModules.apps.getAppSchema(options.appId)
    if (!appSchema) {
        return null
    }
    if (appSchema.schema.collectionDefinitions) {
        storageManager.registry.registerCollections(appSchema.schema.collectionDefinitions)
    }
    await storageManager.finishInitialization()
    await storageManager.backend.migrate()

    return storageManager
}
