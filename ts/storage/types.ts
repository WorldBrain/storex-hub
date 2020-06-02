import StorageManager from "@worldbrain/storex";
import { AppStorage } from "./modules/apps";
import { PluginManagementStorage } from "../plugins/storage";
import { RecipeStorage } from "./modules/recipes";

export interface Storage {
    manager: StorageManager
    systemModules: SystemStorageModules
}

export interface SystemStorageModules {
    apps: AppStorage
    plugins: PluginManagementStorage
    recipes: RecipeStorage
}