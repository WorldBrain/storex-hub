import expect from "expect"
import { PluginInfo } from "@worldbrain/storex-hub-interfaces/lib/plugins"
import { withTestApplication } from "../../tests/api/index.tests"
import { discoverPlugins } from "."
import { Application } from "../../application"

const PLUGINS: { [path: string]: PluginInfo } = {
    'plugins/one': {
        identifier: 'net.one-plugin',
        version: '0.0.1',
        description: 'the one plugin',
        apps: [{ name: 'one' }],
        siteUrl: 'https//one-plugin.net',
        mainPath: 'plugins/one/lib/main.ts',
        entryFunction: 'main'
    },
    'plugins/two': {
        identifier: 'net.two-plugin',
        version: '0.0.1',
        description: 'the two plugin',
        apps: [{ name: 'two' }],
        siteUrl: 'https//two-plugin.net',
        mainPath: 'plugins/two/lib/main.ts',
        entryFunction: 'main'
    },
}

describe('Plugin discovery', () => {
    async function discover(applcation: Application) {
        const confirmationsAsked: PluginInfo[] = []
        const storage = await applcation.storage
        const pluginManagementStorage = storage.systemModules.plugins
        await discoverPlugins(Object.keys(PLUGINS), {
            getPluginInfo: async path => ({ ...PLUGINS[path] }),
            confirmPluginInstall: async info => {
                confirmationsAsked.push(info)
                return 'install'
            },
            pluginManagementStorage: pluginManagementStorage,
        })
        return { confirmationsAsked }
    }

    it('should discover plugins and correctly add new ones after asking confirmation', async () => {
        await withTestApplication(async (applcation) => {
            const { confirmationsAsked } = await discover(applcation)
            expect(confirmationsAsked).toEqual(Object.values(PLUGINS))

            const storage = await applcation.storage
            expect(await storage.manager.operation('findObjects', 'pluginInfo', {})).toEqual(
                Object.entries(PLUGINS).map(([path, pluginInfo]) => ({
                    id: expect.any(Number),
                    identifier: pluginInfo.identifier,
                    addedWhen: expect.any(Number),
                    enabled: true,
                    path,
                    info: pluginInfo,
                }))
            )
        })
    })

    it('should discover plugins and correctly add new ones after asking confirmation, ignoring existing ones', async () => {
        await withTestApplication(async (applcation) => {
            const { confirmationsAsked: firstConfirmationsAsked } = await discover(applcation)
            expect(firstConfirmationsAsked).toEqual(Object.values(PLUGINS))

            const { confirmationsAsked: secondConfirmationsAsked } = await discover(applcation)
            expect(secondConfirmationsAsked).toEqual([])

            const storage = await applcation.storage
            expect(await storage.manager.operation('findObjects', 'pluginInfo', {})).toEqual(
                Object.entries(PLUGINS).map(([path, pluginInfo]) => ({
                    id: expect.any(Number),
                    identifier: pluginInfo.identifier,
                    addedWhen: expect.any(Number),
                    enabled: true,
                    path,
                    info: pluginInfo,
                }))
            )
        })
    })
})