import path from 'path'
import { existsSync, readFileSync } from 'fs'
import yargs from 'yargs'
import fastGlob from 'fast-glob'
import createPrompt from 'prompt-sync'
import { PROJECT_ROOT } from '../../constants'
import { setupApplication } from '../../main'
import { discoverPlugins } from '.'
import { PluginInfo } from '../types'
const prompt = createPrompt()

interface Args {
    pluginGlobPattern: string
}

const NODE_MODULES_DIR = path.join(PROJECT_ROOT, 'node_modules')

function parseArgs(): Args {
    return yargs
        .option('plugin-glob-pattern', {
            description: 'Where to look for plugins',
            default: '<node_modules>/storex-hub-plugin-*',
            type: 'string',
        })
        .argv as any as Args
}

function validatePluginInfo(untrusted: any): PluginInfo | null {
    return untrusted
}

async function main() {
    const args = parseArgs()
    const pluginDirGlob = args.pluginGlobPattern.replace('<node_modules>', NODE_MODULES_DIR)
    const pluginDirs = await fastGlob([pluginDirGlob], {
        onlyDirectories: true
    })

    const application = await setupApplication()
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
        async confirmPluginInstall(pluginInfo: PluginInfo, { pluginDir }) {
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
        },
    })
}

if (require.main === module) {
    main()
}