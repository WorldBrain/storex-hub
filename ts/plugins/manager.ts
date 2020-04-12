import { PluginManagementStorage } from "./storage";
import { PluginInfo, PluginEntryFunction, PluginInterface } from "@worldbrain/storex-hub-interfaces/lib/plugins";
import { StorexHubApi_v0 } from "../public-api";

export class PluginManager {
    loadedPlugins: { [identifier: string]: PluginInterface } = {}

    constructor(private options: {
        pluginManagementStorage: PluginManagementStorage
    }) {

    }

    async setup(createAPI: () => Promise<StorexHubApi_v0>) {
        const enabledPlugins = await this.options.pluginManagementStorage.getInfoForEnabledPlugins()
        for (const pluginInfo of enabledPlugins) {
            (async () => {
                const plugin = await this._loadPlugin(pluginInfo, createAPI)
                if (!plugin) {
                    return
                }

                await plugin.start()
            })()
        }
    }

    async _loadPlugin(pluginInfo: PluginInfo, createAPI: () => Promise<StorexHubApi_v0>): Promise<PluginInterface | null> {
        let pluginModule: any
        try {
            pluginModule = require(pluginInfo.mainPath)
        } catch (e) {
            console.error(`ERROR - Could not require plugin ${pluginInfo.identifier} at path ${pluginInfo.mainPath}:`)
            console.error(e)
            return null
        }

        const entryFunction: PluginEntryFunction = pluginModule[pluginInfo.entryFunction]
        if (!entryFunction) {
            console.error(`ERROR - Could not find entry function '${pluginInfo.entryFunction}' in plugin ${pluginInfo.identifier}`)
            return null
        }

        try {
            this.loadedPlugins[pluginInfo.identifier] = await entryFunction({ api: await createAPI() })
        } catch (e) {
            console.error(`ERROR during initialization plugin '${pluginInfo.identifier}':`)
            console.error(e)
            return null
        }

        return this.loadedPlugins[pluginInfo.identifier]
    }
}
