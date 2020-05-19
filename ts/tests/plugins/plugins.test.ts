import tempy from "tempy"
import del from "del"
import path from "path"
import { copy } from "fs-extra"
import expect from "expect"
import { createEntryPointTestSuite } from "../index.tests"

const TEST_PLUGIN_IDENTIFIER = 'io.worldbrain.storex-hub.test-plugin'

const listedPlugins = (status: string) => ({
    status: 'success',
    plugins: [
        expect.objectContaining({
            identifier: TEST_PLUGIN_IDENTIFIER
        })
    ],
    state: {
        [TEST_PLUGIN_IDENTIFIER]: {
            status
        }
    }
})

export default createEntryPointTestSuite('Plugins', ({ it }) => {
    it('should correctly list plugins and install listed plugins by identifier', async ({ start, getApplication }) => {
        const tmpDir = tempy.directory()
        const dbPath = path.join(tmpDir, 'db')
        const pluginsDir = path.join(tmpDir, 'plugins')
        try {
            const { createSession } = await start({
                runtimeConfig: {
                    dbPath,
                    pluginsDir
                }
            })
            console.log('efefea 1')
            const location = path.join(__dirname, 'test-plugin')
            await copy(location, path.join(pluginsDir, 'test-plugin'))
            console.log('efefea 2')
            const { api } = await createSession()
            console.log('efefea 3')
            expect(await api.listPlugins()).toEqual(listedPlugins('available'))
            const installResponse = await api.installPlugin({
                identifier: TEST_PLUGIN_IDENTIFIER
            })
            expect(installResponse).toEqual({ status: 'success' })

            const application = getApplication()
            if (application) {
                expect(application.pluginManager.loadedPlugins).toEqual({
                    [TEST_PLUGIN_IDENTIFIER]: expect.objectContaining({ running: true })
                })
            }
            expect(await api.listPlugins()).toEqual(listedPlugins('enabled'))
        } finally {
            del(tmpDir, { force: true })
        }
    })

    it('should correctly install new plugins by filesystem location', async ({ start, getApplication }) => {
        const dbPath = tempy.directory()
        try {
            const { createSession } = await start({
                runtimeConfig: {
                    dbPath,
                }
            })
            const { api } = await createSession()
            const location = path.join(__dirname, 'test-plugin')
            const installResponse = await api.installPlugin({ location })
            expect(installResponse).toEqual({ status: 'success' })
            const application = getApplication()
            if (application) {
                expect(application.pluginManager.loadedPlugins).toEqual({
                    [TEST_PLUGIN_IDENTIFIER]: expect.objectContaining({ running: true })
                })
            }
            expect(await api.listPlugins()).toEqual(listedPlugins('enabled'))
        } finally {
            del(dbPath, { force: true })
        }
    })

    it('should correctly inspect an installed plugin', async ({ start, getApplication }) => {
        const tmpDir = tempy.directory()
        const dbPath = path.join(tmpDir, 'db')
        const pluginDir = path.join(tmpDir, 'plugins')
        try {
            const { createSession } = await start({
                runtimeConfig: {
                    dbPath,
                    pluginsDir: pluginDir
                }
            })
            const location = path.join(__dirname, 'test-plugin')
            await copy(location, path.join(pluginDir, 'test-plugin'))
            const { api } = await createSession()
            const installResponse = await api.installPlugin({
                identifier: TEST_PLUGIN_IDENTIFIER
            })
            expect(installResponse).toEqual({ status: 'success' })
            const application = getApplication()
            if (application) {
                expect(application.pluginManager.loadedPlugins).toEqual({
                    [TEST_PLUGIN_IDENTIFIER]: expect.objectContaining({ running: true })
                })
            }
            expect(await api.inspectPlugin({ identifier: TEST_PLUGIN_IDENTIFIER })).toEqual({
                status: 'success',
                pluginInfo: expect.objectContaining({ identifier: TEST_PLUGIN_IDENTIFIER })
            })
        } finally {
            del(dbPath, { force: true })
        }
    })

    it('should correctly inspect an available plugin', async ({ start, getApplication }) => {
        const tmpDir = tempy.directory()
        const dbPath = path.join(tmpDir, 'db')
        const pluginDir = path.join(tmpDir, 'plugins')
        try {
            const { createSession } = await start({
                runtimeConfig: {
                    dbPath,
                    pluginsDir: pluginDir
                }
            })
            const location = path.join(__dirname, 'test-plugin')
            await copy(location, path.join(pluginDir, 'test-plugin'))
            const { api } = await createSession()
            expect(await api.inspectPlugin({ identifier: TEST_PLUGIN_IDENTIFIER })).toEqual({
                status: 'success',
                pluginInfo: expect.objectContaining({ identifier: TEST_PLUGIN_IDENTIFIER })
            })
        } finally {
            del(tmpDir, { force: true })
        }
    })
})
