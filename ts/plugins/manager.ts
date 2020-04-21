import path from 'path'
import { PluginManagementStorage } from "./storage";
import { PluginInfo, PluginEntryFunction, PluginInterface } from "@worldbrain/storex-hub-interfaces/lib/plugins";
import { StorexHubApi_v0, PluginLoadError_v0, InstallPluginResult_v0, StorexHubCallbacks_v0 } from "../public-api";

export class PluginManager {
    loadedPlugins: { [identifier: string]: PluginInterface } = {}
    private pluginStorage!: PluginManagementStorage

    constructor(private options: {
        createApi: (appIdentifer: string, options?: { callbacks?: StorexHubCallbacks_v0 }) => Promise<StorexHubApi_v0>
    }) {

    }

    async setup(pluginStorage: PluginManagementStorage) {
        this.pluginStorage = pluginStorage
        const enabledPlugins = await pluginStorage.getInfoForEnabledPlugins()

        for (const pluginInfo of enabledPlugins) {
            (async () => {
                await this._loadPlugin(pluginInfo)
            })()
        }
    }

    async installPlugin(pluginInfo: PluginInfo, options: { location: string }): Promise<InstallPluginResult_v0> {
        const existingPluginInfo = await this.pluginStorage.getPluginInfoByIdentifier(pluginInfo.identifier)
        if (existingPluginInfo) {
            return { status: 'already-installed' }
        }
        await this.pluginStorage.addPlugin(pluginInfo, { path: options.location })
        pluginInfo.mainPath = path.join(options.location, pluginInfo.mainPath)

        const loadResult = await this._loadPlugin(pluginInfo)
        if (loadResult.status !== 'success') {
            return { status: 'installed-but-errored', error: loadResult }
        }

        return { status: 'success' }
    }

    async _loadPlugin(pluginInfo: PluginInfo): Promise<{ status: 'success' } | PluginLoadError_v0> {
        let pluginModule: any
        try {
            pluginModule = require(pluginInfo.mainPath)
        } catch (e) {
            console.error(`ERROR - Could not require plugin ${pluginInfo.identifier} at path ${pluginInfo.mainPath}:`)
            console.error(e)
            return { status: 'plugin-require-failed' }
        }

        const entryFunction: PluginEntryFunction = pluginModule[pluginInfo.entryFunction]
        if (!entryFunction) {
            console.error(`ERROR - Could not find entry function '${pluginInfo.entryFunction}' in plugin ${pluginInfo.identifier}, file ${pluginInfo.mainPath}`)
            return { status: 'missing-entry-function', entryFunction: pluginInfo.entryFunction }
        }

        let plugin: PluginInterface
        try {
            plugin = this.loadedPlugins[pluginInfo.identifier] = await entryFunction({
                getApi: options => this.options.createApi(pluginInfo.identifier, options),
            })
        } catch (e) {
            console.error(`ERROR during initialization plugin '${pluginInfo.identifier}':`)
            console.error(e)
            return { status: 'entry-function-failed' }
        }

        try {
            await plugin.start()
            console.log('Started plugin ' + pluginInfo.identifier)
            return { status: 'success' }
        } catch (e) {
            console.error(e)
            return { status: 'start-failed' }
        }
    }
}
