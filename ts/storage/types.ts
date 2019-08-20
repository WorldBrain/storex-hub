import StorageManager from "@worldbrain/storex";
import { AppStorage } from "./modules/apps";

export interface Storage {
    manager : StorageManager
    systemModules : StandardStorageModules
}

export interface StandardStorageModules {
    apps : AppStorage
}