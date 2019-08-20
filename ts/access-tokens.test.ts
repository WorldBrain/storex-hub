import expect from 'expect'
import { AccessTokenManager, DevelopmentAccessTokenManager } from './access-tokens';
import { sequentialTokenGenerator } from './access-tokens.tests';

function testAccessTokenManager(options : { runner : (body : (setup : { accessTokenManager : AccessTokenManager }) => Promise<void>) => Promise<void> }) {
    it('should generate and validate tokens', async () => {
        await options.runner(async ({accessTokenManager}) => {
            const token = await accessTokenManager.createToken()
            expect(await accessTokenManager.validateToken({
                providedToken: token.plainTextToken, actualHash: token.hashedToken
            })).toEqual(true)
        })
    })

    it('should reject invalid tokens', async () => {
        await options.runner(async ({accessTokenManager}) => {
            const token = await accessTokenManager.createToken()
            expect(await accessTokenManager.validateToken({
                providedToken: token.plainTextToken + '!?!?!', actualHash: token.hashedToken
            })).toEqual(false)
        })
    })
}

describe('Access token manager', () => {
    describe('Memory access token manager', () => {
        testAccessTokenManager({
            runner: async (body) => {
                await body({ accessTokenManager: new DevelopmentAccessTokenManager({
                    tokenGenerator: sequentialTokenGenerator()
                }) })
            }
        })
    })
})

