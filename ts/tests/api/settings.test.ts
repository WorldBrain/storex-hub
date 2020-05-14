import pick from 'lodash/pick'
import expect from 'expect';
import { createApiTestSuite } from "./index.tests";
import { SettingsDescription } from '@worldbrain/storex-hub-interfaces/lib/settings';

export default createApiTestSuite('App settings', ({ it }) => {
    it('should store and retrieve app settings', async ({ createSession }) => {
        const { api: app } = await createSession()
        await app.registerApp({ name: 'contacts', identify: true })

        const settings = { foo: 'spam', bar: 5, ham: false }
        await app.setAppSettings({ updates: { ...settings } })
        expect(await app.getAppSettings({ keys: 'all' })).toEqual({
            status: 'success',
            settings,
        })
        expect(await app.getAppSettings({ keys: ['foo', 'bar'] })).toEqual({
            status: 'success',
            settings: { foo: settings.foo, bar: settings.bar },
        })
    })

    it('should delete app settings', async ({ createSession }) => {
        const { api: app } = await createSession()
        await app.registerApp({ name: 'contacts', identify: true })

        const settings = { foo: 'spam', bar: 5, ham: false }
        await app.setAppSettings({ updates: { ...settings } })

        await app.deleteAppSettings({ keys: ['foo'] })
        expect(await app.getAppSettings({ keys: 'all' })).toEqual({
            status: 'success',
            settings: pick(settings, ['bar', 'ham']),
        })

        await app.deleteAppSettings({ keys: 'all' })
        expect(await app.getAppSettings({ keys: 'all' })).toEqual({
            status: 'success',
            settings: {},
        })
    })

    it('should store, retrieve and delete app settings from other apps', async ({ createSession }) => {
        const { api: contacts } = await createSession()
        await contacts.registerApp({ name: 'contacts', identify: true })

        const { api: manager } = await createSession()
        await manager.registerApp({ name: 'manager', identify: true })

        const settings = { foo: 'spam', bar: 5, ham: false }
        await manager.setAppSettings({ updates: { ...settings }, app: 'contacts' })
        expect(await contacts.getAppSettings({ keys: 'all' })).toEqual({
            status: 'success',
            settings,
        })
        expect(await manager.getAppSettings({ keys: 'all', app: 'contacts' })).toEqual({
            status: 'success',
            settings,
        })

        await manager.deleteAppSettings({ keys: ['foo'], app: 'contacts' })
        delete settings['foo']
        expect(await contacts.getAppSettings({ keys: 'all' })).toEqual({
            status: 'success',
            settings,
        })
        expect(await manager.getAppSettings({ keys: 'all', app: 'contacts' })).toEqual({
            status: 'success',
            settings,
        })
    })

    it('should describe and get setting descriptions', async ({ createSession }) => {
        const { api: contacts } = await createSession()
        await contacts.registerApp({ name: 'contacts', identify: true })

        const { api: manager } = await createSession()
        await manager.registerApp({ name: 'manager', identify: true })

        const description: SettingsDescription = {
            layout: {
                sections: [
                    {
                        title: 'First', contents: [
                            { field: 'one' }
                        ]
                    }
                ]
            },
            fields: {
                one: {
                    type: 'string',
                    label: 'one',
                    widget: { type: 'text-input' },
                }
            }
        }
        const describeResult = await contacts.describeAppSettings({ description })
        expect(describeResult).toEqual({ status: 'success' })

        const ownRetrieval = await contacts.getAppSettingsDescription({})
        expect(ownRetrieval).toEqual({ status: 'success', description })

        const foreignRetrieval = await manager.getAppSettingsDescription({ app: 'contacts' })
        expect(foreignRetrieval).toEqual({ status: 'success', description })
    })
})
