import fs from 'fs'
import path from 'path'
import { PluginManagementStorage } from "./storage";
import { PluginInfo, PluginEntryFunction, PluginInterface } from "@worldbrain/storex-hub-interfaces/lib/plugins";
import { StorexHubApi_v0, PluginLoadError_v0, InstallPluginResult_v0, StorexHubCallbacks_v0, ListPluginsResult_v0, InstallPluginOptions_v0, InspectPluginOptions_v0, InspectPluginResult_v0 } from "../public-api";
import { getPluginInfo } from './utils';

type FsModule = Pick<typeof fs, 'readdirSync' | 'readFileSync' | 'existsSync'>
export class PluginManager {
    loadedPlugins: { [identifier: string]: PluginInterface } = {}
    private pluginStorage!: PluginManagementStorage
    private fsModule: FsModule

    constructor(private options: {
        createApi: (appIdentifer: string, options?: { callbacks?: StorexHubCallbacks_v0 }) => Promise<StorexHubApi_v0>
        pluginsDir?: string
        fsModule?: FsModule
    }) {
        this.fsModule = options.fsModule ?? fs
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

    async listPlugins(): Promise<ListPluginsResult_v0> {
        const result: ListPluginsResult_v0 = {
            status: 'success',
            plugins: [],
            state: {},
        }

        const allMetadata = await this.pluginStorage.getAllPluginMetadata()
        for (const pluginMetadata of allMetadata) {
            result.plugins.push(pluginMetadata.info)
            result.state[pluginMetadata.identifier] = {
                status: pluginMetadata.enabled ? 'enabled' : 'disabled'
            }
        }

        if (!this.options.pluginsDir || !this.fsModule.existsSync(this.options.pluginsDir)) {
            return result
        }

        if (!this.fsModule.existsSync(this.options.pluginsDir)) {
            return result
        }

        const pluginDirNames = this.fsModule.readdirSync(this.options.pluginsDir)
        for (const pluginDirName of pluginDirNames) {
            const maybePluginInfo = await getPluginInfo(path.join(this.options.pluginsDir, pluginDirName), this.fsModule)
            if (maybePluginInfo.status !== 'success') {
                continue
            }

            const existingState = result.state[maybePluginInfo.pluginInfo.identifier]
            if (existingState) {
                continue
            }

            result.plugins.push(maybePluginInfo.pluginInfo)
            result.state[maybePluginInfo.pluginInfo.identifier] = {
                status: 'available',
            }
        }

        return result
    }

    async inspectPlugin(options: InspectPluginOptions_v0): Promise<InspectPluginResult_v0> {
        if ('location' in options) {
            throw new Error(`Not implemented`)
        }

        const findResult = await this._findPluginByIdentifier(options.identifier)
        if (!findResult) {
            return { status: 'not-found', identifier: options.identifier }
        }
        return {
            status: 'success',
            pluginInfo: findResult.pluginInfo,
        }
    }

    async installPlugin(options: InstallPluginOptions_v0): Promise<InstallPluginResult_v0> {
        let pluginInfo: PluginInfo
        let location: string
        if ('location' in options) {
            const maybePluginInfo = await getPluginInfo(options.location, this.fsModule)
            if (maybePluginInfo.status !== 'success') {
                return maybePluginInfo
            }

            pluginInfo = maybePluginInfo.pluginInfo
            location = options.location
        } else {
            const findResult = await this._findPluginByIdentifier(options.identifier)
            if (!findResult) {
                return { status: 'not-found', identifier: options.identifier }
            }

            pluginInfo = findResult.pluginInfo
            location = findResult.location
        }

        const existingPluginInfo = await this.pluginStorage.getPluginInfoByIdentifier(pluginInfo.identifier)
        if (existingPluginInfo) {
            return { status: 'already-installed' }
        }
        await this.pluginStorage.addPlugin(pluginInfo, { path: location })
        pluginInfo.mainPath = path.join(location, pluginInfo.mainPath)

        const loadResult = await this._loadPlugin(pluginInfo)
        if (loadResult.status !== 'success') {
            return { status: 'installed-but-errored', error: loadResult }
        }

        return { status: 'success' }
    }

    async _findPluginByIdentifier(identifier: string): Promise<null | { location: string, pluginInfo: PluginInfo }> {
        const installedPlugins = await this.pluginStorage.getAllPluginMetadata()
        for (const installedPlugin of installedPlugins) {
            if (installedPlugin.identifier === identifier) {
                return { location: installedPlugin.path, pluginInfo: installedPlugin.info }
            }
        }

        if (!this.options.pluginsDir) {
            return null
        }

        const pluginDirNames = this.fsModule.readdirSync(this.options.pluginsDir)
        for (const pluginDirName of pluginDirNames) {
            const location = path.join(this.options.pluginsDir, pluginDirName);
            const maybePluginInfo = await getPluginInfo(location, this.fsModule)
            if (maybePluginInfo.status !== 'success') {
                continue
            }

            if (maybePluginInfo.pluginInfo.identifier === identifier) {
                return { location, pluginInfo: maybePluginInfo.pluginInfo }
            }
        }

        return null
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
