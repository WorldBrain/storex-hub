import expect from 'expect';
import createResolvable from '@josephg/resolvable'
import { createMultiApiTestSuite, MultiApiTestSetup } from "./index.tests";
import { HandleRemoteCallOptions_v0 } from '../../public-api';

export default createMultiApiTestSuite('Integration Recipes', ({ it }) => {
    async function setupTest({ createSession }: Pick<MultiApiTestSetup, 'createSession'>) {
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

        const callsExecuted = [createResolvable<HandleRemoteCallOptions_v0>()]
        const { api: integrationApp } = await createSession({
            type: 'websocket', callbacks: {
                handleRemoteCall: async (incoming) => {
                    callsExecuted.slice(-1)[0].resolve(incoming)
                    callsExecuted.push(createResolvable())
                    return { status: 'success', result: { incoming } }
                }
            }
        })
        await integrationApp.registerApp({ name: 'test.integration', identify: true })

        return { sourceApp, integrationApp, callsExecuted }
    }

    it('should execute an operation when a remote create matching a selector is detected', async ({ createSession }) => {
        const { sourceApp, integrationApp, callsExecuted } = await setupTest({ createSession })
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
        expect(await callsExecuted[0]).toEqual({
            call: 'test',
            args: { tag: { pk: 'one', values: { name: 'share' } } }
        })
    })

    it('should execute an operation when a remote change matching a selector is detected', async ({ createSession }) => {
        const { sourceApp, integrationApp, callsExecuted } = await setupTest({ createSession })
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
                    modify: [
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
                        { type: 'modify', collection: 'tags', pks: ['one', 'two'], where: { id: { $in: ['one', 'two'] } }, updates: { name: 'share' } }
                    ]
                }
            }
        })
        expect(await callsExecuted[0]).toEqual({
            call: 'test',
            args: { tag: { pk: 'one', updates: { name: 'share' } } }
        })
        expect(await callsExecuted[1]).toEqual({
            call: 'test',
            args: { tag: { pk: 'two', updates: { name: 'share' } } }
        })
    })
})
