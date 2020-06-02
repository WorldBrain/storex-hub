import expect from 'expect';
import { createApiTestSuite } from "./index.tests";
import * as apiTypes from '../../public-api';

const IDENTIFIED_SESSION_INFO: apiTypes.GetSessionInfoResult_v0 = {
    status: 'success',
    appIdentifier: 'contacts'
}

const ANONYMOUS_SESSION_INFO: apiTypes.GetSessionInfoResult_v0 = {
    status: 'success',
}

export default createApiTestSuite('Application registration and identification', ({ it }) => {
    it('should be able to register a new app', async ({ createSession }) => {
        const { api: app } = await createSession()
        const result = await app.registerApp({ name: 'contacts' })
        expect(result).toEqual({ status: 'success', accessToken: 'token-1' })
        expect(await app.getSessionInfo()).toEqual(ANONYMOUS_SESSION_INFO)
    })

    it('should be able to register a new app and identify automatically', async ({ createSession }) => {
        const { api: app } = await createSession()
        const result = await app.registerApp({ name: 'contacts', identify: true })
        expect(result).toEqual({ status: 'success', accessToken: 'token-1' })
        expect(await app.getSessionInfo()).toEqual(IDENTIFIED_SESSION_INFO)
    })

    it('should generate a new access token when registering an already existing app', async ({ createSession }) => {
        const { api: firstApp } = await createSession()
        await firstApp.registerApp({ name: 'contacts' })

        const secondApp = (await createSession()).api;
        const result = await secondApp.registerApp({ name: 'contacts', identify: true })
        expect(result).toEqual({ status: 'success', accessToken: 'token-2' })
        expect(await secondApp.getSessionInfo()).toEqual(IDENTIFIED_SESSION_INFO)
        expect(await firstApp.getSessionInfo()).toEqual(ANONYMOUS_SESSION_INFO)
    })

    it('should be able to identify an app with an access key', async ({ createSession }) => {
        const { api: app } = await createSession()
        const registrationResult = await app.registerApp({ name: 'contacts' })

        const identificationResult = await app.identifyApp({
            name: 'contacts',
            accessToken: (registrationResult as { accessToken: string }).accessToken
        })
        expect(identificationResult).toEqual({ status: 'success' })
        expect(await app.getSessionInfo()).toEqual(IDENTIFIED_SESSION_INFO)
    })

    it('should not allow identifying an app with an incorrect access key', async ({ createSession }) => {
        const { api: app } = await createSession()
        await app.registerApp({ name: 'contacts' })

        const identificationResult = await app.identifyApp({
            name: 'contacts',
            accessToken: 'totally wrong key'
        })
        expect(identificationResult).toEqual({
            status: 'invalid-access-token',
        })
        expect(await app.getSessionInfo()).toEqual(ANONYMOUS_SESSION_INFO)
    })

    it('should not allow two sessions for one app at the same time (do we want this?)'/* , async ({ api }) => {
        const api1 = await application.api()
        const registrationResult = await api1.registerApp({ name: 'contacts' })
        
        const identificationResult1 = await api1.identifyApp({ name: 'contacts',
            accessToken: (registrationResult as { accessToken: string }).accessToken
        })
        expect(identificationResult1).toEqual({ status: 'success' })

        const api2 = await application.api()
        const identificationResult2 = await api2.identifyApp({ name: 'contacts',
            accessToken: (registrationResult as { accessToken: string }).accessToken
        })
        expect(identificationResult2).toEqual({ success: false, errorCode: IdentifyAppError_v0.DUPLICATE_IDENTFICATION })
    } */)

    it('should not leak information about active sessions to identifications with wrong key', async ({ createSession }) => {
        const { api: app1 } = await createSession()
        const registrationResult = await app1.registerApp({ name: 'contacts' })

        const identificationResult1 = await app1.identifyApp({
            name: 'contacts',
            accessToken: (registrationResult as { accessToken: string }).accessToken
        })
        expect(identificationResult1).toEqual({ status: 'success' })
        expect(await app1.getSessionInfo()).toEqual(IDENTIFIED_SESSION_INFO)

        const { api: app2 } = await createSession()
        const identificationResult2 = await app2.identifyApp({
            name: 'contacts',
            accessToken: 'wrong key'
        })
        expect(identificationResult2).toEqual({
            status: 'invalid-access-token',
        })
        expect(await app2.getSessionInfo()).toEqual(ANONYMOUS_SESSION_INFO)
    })
})
