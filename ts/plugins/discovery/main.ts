import path from 'path'
import { existsSync, readFileSync } from 'fs'
import fastGlob from 'fast-glob'
import createPrompt from 'prompt-sync'
import { PluginInfo } from "@worldbrain/storex-hub-interfaces/lib/plugins";
import { discoverPlugins, PluginInstallConfirmer } from '.'
import { Application } from '../../application'
const prompt = createPrompt()

function validatePluginInfo(untrusted: any): PluginInfo | null {
    return untrusted
}

export async function discoverInstalledPlugins(application: Application, options: {
    pluginDirGlob?: string
    nodeModulesPath: string
    confirmPluginInstall?: PluginInstallConfirmer
}) {
    const pluginDirGlob = (
        options.pluginDirGlob || '<node_modules>/storex-hub-plugin-*'
    ).replace('<node_modules>', options.nodeModulesPath)
    const pluginDirs = (await fastGlob([pluginDirGlob], {
        onlyDirectories: true
    })).map(dir => path.resolve(dir))

    const storage = await application.storage

    await discoverPlugins(pluginDirs, {
        pluginManagementStorage: storage.systemModules.plugins,
        async getPluginInfo(pluginDir: string) {
            const packageInfoPath = path.join(pluginDir, 'package.json')
            if (!existsSync(packageInfoPath)) {
                console.error(`ERROR: Storex Hub plugin has no package.json: ${pluginDir}`)
                return null
            }

            const packageInfo = JSON.parse(readFileSync(packageInfoPath).toString())
            if (!packageInfo['storexHub']) {
                console.error(`ERROR: Storex Hub plugin's package.json has no "storexHub" entry: ${pluginDir}`)
                return null
            }

            const pluginInfo = validatePluginInfo(packageInfo['storexHub'])
            return pluginInfo
        },
        confirmPluginInstall: options.confirmPluginInstall ?? confirmPluginInstallByPrompt,
    })
}

const confirmPluginInstallByPrompt: PluginInstallConfirmer = async (pluginInfo: PluginInfo, { pluginDir }) => {
    let result: string | undefined
    do {
        console.log([
            `Found new plugin in directory ${pluginDir}:`,
            `- Description: ${pluginInfo.description}`,
            `- Website: ${pluginInfo.siteUrl}`,
        ].join('\n'))
        result = prompt(
            `Only install plugins you trust. Do you want to install this one? [y/N] `,
            'N'
        )
        if (!result) {
            return 'abort'
        }

        if (result) {
            result = result.toLowerCase()
        }
        if (['y', 'n', 'yes', 'no'].indexOf(result) === -1) {
            console.error(`Invalid response: ${result}`)
            result = undefined
        }
    } while (!result)

    if (result.startsWith('y')) {
        console.log('Installing plugin...')
        return 'install'
    } else {
        console.log('OK, skipping this plugin...')
        return 'skip'
    }
}
