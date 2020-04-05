import { PluginInfo } from "../types";
import { PluginManagementStorage } from "../storage";

export async function discoverPlugins(pluginDirs: string[], options: {
    getPluginInfo: (pluginDir: string) => Promise<PluginInfo | null>
    confirmPluginInstall: (pluginInfo: PluginInfo, options: { pluginDir: string }) => Promise<'install' | 'skip' | 'abort'>
    pluginManagementStorage: PluginManagementStorage
}) {
    for (const pluginDir of pluginDirs) {
        const pluginInfo = await options.getPluginInfo(pluginDir)
        if (!pluginInfo) {
            continue
        }

        const existingPluginInfo = await options.pluginManagementStorage.getPluginInfoByIdentifier(pluginInfo.identifier)
        if (existingPluginInfo) {
            continue
        }

        const confirmation = await options.confirmPluginInstall(pluginInfo, { pluginDir });
        if (confirmation === 'skip') {
            continue
        } else if (confirmation === 'abort') {
            break
        }

        await options.pluginManagementStorage.addPlugin(pluginInfo, { path: pluginDir })
    }
}
