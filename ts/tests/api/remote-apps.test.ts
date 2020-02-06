import { createMultiApiTestSuite } from "./index.tests";
import expect = require("expect");

export default createMultiApiTestSuite('Remote apps', ({ it }) => {
    it('should be able to proxy operations into a remote app', async ({ application }) => {
        const operations: any[] = []
        const memex = await application.api({
            type: 'websocket',
            callbacks: {
                handleRemoteOperation: async (options) => {
                    operations.push(options.operation)
                    return { result: ['foo', 'bla'] }
                }
            }
        })
        await memex.registerApp({ name: 'memex', identify: true, remote: true })

        const backupApp = await application.api({ type: 'http' })
        await backupApp.registerApp({ name: 'backup' })
        const { result } = await backupApp.executeRemoteOperation({
            app: 'memex',
            operation: ['findObjects', 'pages', { url: 'foo.com/bar' }]
        })
        expect(operations).toEqual([
            ['findObjects', 'pages', { url: 'foo.com/bar' }]
        ])
        expect(result).toEqual(['foo', 'bla'])
    })
})
