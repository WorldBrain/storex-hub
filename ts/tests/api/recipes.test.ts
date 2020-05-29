import expect from 'expect';
import createResolvable from '@josephg/resolvable'
import { createMultiApiTestSuite } from "./index.tests";
import { HandleRemoteCallOptions_v0 } from '../../public-api';

export default createMultiApiTestSuite('Integration Recipes', ({ it }) => {
    it('should execute an operation when a remote create matching a selector is detected', async ({ createSession }) => {
        let subscriptionCount = 0
        const { api: sourceApp } = await createSession({
            type: 'websocket', callbacks: {
                handleSubscription: async () => {
                    return { status: 'success', subscriptionId: (++subscriptionCount).toString() }
                },
                handleRemoteOperation: async () => {
                    return { status: 'success', result: [] }
                }
            }
        })
        await sourceApp.registerApp({ name: 'test.source', identify: true })

        const callExecuted = createResolvable<HandleRemoteCallOptions_v0>()
        const { api: integrationApp } = await createSession({
            type: 'websocket', callbacks: {
                handleRemoteCall: async (incoming) => {
                    callExecuted.resolve(incoming)
                    return { status: 'success', result: { incoming } }
                }
            }
        })
        await integrationApp.registerApp({ name: 'test.integration', identify: true })

        await integrationApp.createRecipe({
            integrateExisting: false,
            recipe: {
                select: {
                    placeholder: 'tag',
                    app: 'test.source',
                    remote: true,
                    collection: 'tags',
                    where: { name: 'share' }
                },
                on: {
                    add: [
                        {
                            app: 'test.integration',
                            call: 'test',
                            args: { tag: { $logic: '$tag' } }
                        }
                    ]
                }
            }
        })
        await sourceApp.emitEvent({
            event: {
                type: 'storage-change',
                info: {
                    changes: [
                        { type: 'create', collection: 'tags', pk: 'one', values: { name: 'share' } }
                    ]
                }
            }
        })
        expect(await callExecuted).toEqual({
            call: 'test',
            args: { tag: { name: 'share' } }
        })
    })
})
