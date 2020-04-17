// import pick from 'lodash/pick'
// import expect from 'expect';
// import { createApiTestSuite } from "./index.tests";

// export default createApiTestSuite('App settings', ({ it }) => {
//     it('should store and retrieve app settings', async ({ createSession }) => {
//         const { api: app } = await createSession()
//         await app.registerApp({ name: 'contacts', identify: true })

//         const settings = { foo: 'spam', bar: 5, ham: false }
//         await app.setAppSettings({ updates: { ...settings } })
//         expect(await app.getAppSettings({ keys: 'all' })).toEqual({
//             status: 'success',
//             settings,
//         })
//         expect(await app.getAppSettings({ keys: ['foo', 'bar'] })).toEqual({
//             status: 'success',
//             settings: { foo: settings.foo, bar: settings.bar },
//         })
//     })

//     it('should delete app settings', async ({ createSession }) => {
//         const { api: app } = await createSession()
//         await app.registerApp({ name: 'contacts', identify: true })

//         const settings = { foo: 'spam', bar: 5, ham: false }
//         await app.setAppSettings({ updates: { ...settings } })

//         await app.deleteAppSettings({ keys: ['foo'] })
//         expect(await app.getAppSettings({ keys: 'all' })).toEqual({
//             status: 'success',
//             settings: pick(settings, ['bar', 'ham']),
//         })

//         await app.deleteAppSettings({ keys: 'all' })
//         expect(await app.getAppSettings({ keys: 'all' })).toEqual({
//             status: 'success',
//             settings: {},
//         })
//     })
// })
