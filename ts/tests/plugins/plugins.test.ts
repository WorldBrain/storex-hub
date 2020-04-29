import { main } from "../../main"
import tempy from "tempy"
import del from "del"
import path from "path"
import { copy } from "fs-extra"
import expect from "expect"


describe('Plugins', () => {
    it('should correctly list plugins and install listed plugins by identifier', async () => {
        const tmpDir = tempy.directory()
        const dbPath = path.join(tmpDir, 'db')
        const pluginDir = path.join(tmpDir, 'plugins')
        try {
            const { application } = await main({
                withoutServer: true,
                runtimeConfig: {
                    dbPath,
                    pluginsDir: pluginDir
                }
            })
            const location = path.join(__dirname, 'test-plugin')
            await copy(location, path.join(pluginDir, 'test-plugin'))
            const api = await application.api()
            expect(await api.listPlugins()).toEqual({
                status: 'success',
                plugins: [
                    expect.objectContaining({
                        identifier: 'io.worldbrain.storex-hub.test-plugin'
                    })
                ],
                state: {
                    'io.worldbrain.storex-hub.test-plugin': {
                        status: 'available'
                    }
                }
            })
            const installResponse = await api.installPlugin({
                identifier: 'io.worldbrain.storex-hub.test-plugin'
            })
            expect(installResponse).toEqual({ status: 'success' })
            expect(application.pluginManager.loadedPlugins).toEqual({
                'io.worldbrain.storex-hub.test-plugin': expect.objectContaining({ running: true })
            })
        } finally {
            del(dbPath, { force: true })
        }
    })

    it('should correctly install new plugins', async () => {
        const dbPath = tempy.directory()
        try {
            const { application } = await main({ withoutServer: true, runtimeConfig: { dbPath } })
            const api = await application.api()
            const location = path.join(__dirname, 'test-plugin')
            const installResponse = await api.installPlugin({ location })
            expect(installResponse).toEqual({ status: 'success' })
            expect(application.pluginManager.loadedPlugins).toEqual({
                'io.worldbrain.storex-hub.test-plugin': expect.objectContaining({ running: true })
            })
        } finally {
            del(dbPath, { force: true })
        }
    })
})
