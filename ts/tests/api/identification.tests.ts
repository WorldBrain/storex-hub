import expect from 'expect';
import { makeAPITestFactory } from "./utils";
import { RegisterAppError_v0, IdentifyAppError_v0, UpdateSchemaError_v0 } from '../../public-api';

export default function testIdentificationAPI() {
    const it = makeAPITestFactory()

    it('should be able to register a new app', async ({ application}) => {
        const api = await application.api()
        const result = await api.registerApp({ name: 'contacts' })
        expect(result).toEqual({ success: true, accessToken: 'token-1' })
    })

    it('should not regsiter an already existing app', async ({ application}) => {
        await (await application.api()).registerApp({ name: 'contacts' })
        
        const result = await (await application.api()).registerApp({ name: 'contacts' })
        expect(result).toEqual({
            success: false,
            errorCode: RegisterAppError_v0.APP_ALREADY_EXISTS,
            errorText: 'App already exists', // TODO: Tricky security issue, since this leaks info about installed apps
        })
    })

    it('should be able to identify an app with an access key', async ({ application}) => {
        const api = await application.api()
        const registrationResult = await api.registerApp({ name: 'contacts' })
        
        const identificationResult = await api.identifyApp({ name: 'contacts',
            accessToken: (registrationResult as { accessToken: string }).accessToken
        })
        expect(identificationResult).toEqual({ success: true })
    })

    it('should not allow identifying an app with an incorrect access key', async ({ application }) => {
        const api = await application.api()
        const registrationResult = await api.registerApp({ name: 'contacts' })
        
        const identificationResult = await api.identifyApp({ name: 'contacts',
            accessToken: 'totally wrong key'
        })
        expect(identificationResult).toEqual({
            success: false, errorCode: IdentifyAppError_v0.INVALID_ACCESS_TOKEN,
            errorText: `Invalid access token`,
        })
    })

    it('should not allow two sessions for one app at the same time (do we want this?)'/* , async ({ application }) => {
        const api1 = await application.api()
        const registrationResult = await api1.registerApp({ name: 'contacts' })
        
        const identificationResult1 = await api1.identifyApp({ name: 'contacts',
            accessToken: (registrationResult as { accessToken: string }).accessToken
        })
        expect(identificationResult1).toEqual({ success: true })

        const api2 = await application.api()
        const identificationResult2 = await api2.identifyApp({ name: 'contacts',
            accessToken: (registrationResult as { accessToken: string }).accessToken
        })
        expect(identificationResult2).toEqual({ success: false, errorCode: IdentifyAppError_v0.DUPLICATE_IDENTFICATION })
    } */)

    it('should not leak information about active sessions to identifications with wrong key', async ({ application }) => {
        const api1 = await application.api()
        const registrationResult = await api1.registerApp({ name: 'contacts' })
        
        const identificationResult1 = await api1.identifyApp({ name: 'contacts',
            accessToken: (registrationResult as { accessToken: string }).accessToken
        })
        expect(identificationResult1).toEqual({ success: true })

        const api2 = await application.api()
        const identificationResult2 = await api2.identifyApp({ name: 'contacts',
            accessToken: 'wrong key'
        })
        expect(identificationResult2).toEqual({
            success: false, errorCode: IdentifyAppError_v0.INVALID_ACCESS_TOKEN,
            errorText: `Invalid access token`,
        })
    })
}
