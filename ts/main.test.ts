import { main } from "./main"
import expect from "expect"

describe('Main entry point', () => {
    it('should correctly discover plugins', async () => {
        const { application, pluginManager } = await main({
            runtimeConfig: { discoverPlugins: 'true' },
            confirmPluginInstall: async () => 'install',
            withoutServer: true,
        })
        expect(pluginManager.loadedPlugins).toEqual({
            'io.worldbrain.storex-hub.internal.self-test': expect.objectContaining({
                running: true
            })
        })
    })
})