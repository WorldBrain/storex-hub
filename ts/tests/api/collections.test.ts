import expect from 'expect';
import { createApiTestSuite } from "./index.tests";
import { UpdateSchemaError_v0 } from '../../public-api';
import { TEST_COLLECTION_DEFINITIONS } from './data';

export default createApiTestSuite('Collection registration and data operations', ({ it }) => {
    it('should be able to register collections and execute data operations', async ({ createSession }) => {
        const { api: app } = await createSession()
        await app.registerApp({ name: 'contacts', identify: true })

        const updateSchemaResult = await app.updateSchema({
            schema: {
                collectionDefinitions: {
                    'user': TEST_COLLECTION_DEFINITIONS.simpleUser({ fields: new Set<'email'>(['email']) })
                }
            }
        })
        expect(updateSchemaResult).toEqual({
            success: true,
        })

        const createResponse = await app.executeOperation({
            operation: ['createObject', 'user', {
                email: 'john@doe.com',
            }]
        })
        expect(createResponse).toEqual({
            status: 'success',
            result: {
                object: {
                    id: (expect as any).anything(),
                    email: 'john@doe.com',
                }
            }
        })

        const fieldResponse = await app.executeOperation({ operation: ['findObjects', 'user', {}] })
        expect(fieldResponse).toEqual({
            status: 'success',
            result: [{
                id: (createResponse as any).result.object.id,
                email: 'john@doe.com',
            }]
        })
    })

    it('should not allow the creation of collections with invalid names', async ({ createSession }) => {
        const { api: app } = await createSession()
        await app.registerApp({ name: 'contacts', identify: true })

        const tryUpdate = async (name: string) => {
            const result = await app.updateSchema({
                schema: {
                    collectionDefinitions: {
                        [name]: TEST_COLLECTION_DEFINITIONS.simpleUser({ fields: new Set<'email'>(['email']) })
                    }
                }
            })
            expect(result).toEqual({
                success: false,
                errorCode: UpdateSchemaError_v0.BAD_REQUEST,
                errorText: `Cannot create collection with invalid name '${name}'`
            })
        }
        await tryUpdate('u8')
        await tryUpdate('u-t')
        await tryUpdate('u!')
    })

    it('should by default not allow fetching data from other apps')

    it(`should be able to register new schema's while running`)
})
