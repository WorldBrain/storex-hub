import expect from 'expect';
import { makeAPITestFactory } from "./utils";

export default async function testSharedReading() {
    const it = makeAPITestFactory()

    it('should allow different applications to register collections for read acces', async ({ application }) => {
        const contactsApi = await application.api()
        await contactsApi.registerApp({ name: 'superContacts', identify: true })

        const terms = {
            onthologies: {
                rdf: {
                    foaf: ''
                }
            },
            definitions: {
                contactDisplayName: ['foaf:nickname'],
                displayName: ['foaf:nickname'],
            }
        }
        await contactsApi.updateSchema({
            schema: {
                collectionDefinitions: {
                    'superContacts:contact': {
                        version: new Date(),
                        fields: {
                            displayName: { type: 'string' }
                        }
                    },
                },
                collectionDescriptions: {
                    'superContacts:contact': {
                        term: 'contact',
                        fields: {
                            displayName: { terms: [ 'contactDisplayName', 'displayName' ] }
                        }
                    }
                },
                terms
            }
        })

        const crmApi = await application.api()
        await crmApi.registerApp({ name: 'superCrm', identify: true })
        await crmApi.updateSchema({
            schema: {
                collectionDefinitions: {
                    'superCrm:customerDetails:': {
                        version: new Date(),
                        fields: {
                            vatNumber: { type: 'string' }
                        }
                    },
                },
                virtualTables: {
                    'contact': {
                        fields: {
                            displayName: { terms: [ 'contactDisplayName', 'displayName' ] }
                        }
                    }
                },
                terms
            }
        })

        const { result: createResult } = await contactsApi.executeOperation({ operation: ['createObject', 'superContacts:contact', {
            displayName: 'John Doe'
        }] })
        const { result: findResult } = await crmApi.executeOperation({ operation: ['findObjects', 'virtual:contact'] })
        expect(findResult).toEqual([
            { displayName: 'John' }
        ])
    })
}
