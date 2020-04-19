import { main } from "../../main"
import tempy from "tempy"
import del from "del"
import path from "path"
import expect from "expect"

describe('Plugins', () => {
    it('should correctly install new plugins', async () => {
        const dbPath = tempy.directory()
        try {
            const { application } = await main({ withoutServer: true })
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
