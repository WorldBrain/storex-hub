import expect from 'expect';
import createResolvable from '@josephg/resolvable'
import { createMultiApiTestSuite, MultiApiTestSetup } from "./index.tests";
import { HandleRemoteCallOptions_v0, StorexHubCallbacks_v0 } from '../../public-api';

export default createMultiApiTestSuite('Integration Recipes', ({ it }) => {
    async function setupTest(options: {
        createSession: MultiApiTestSetup['createSession'],
        sourceCallbacks?: StorexHubCallbacks_v0
    }) {
        let subscriptionCount = 0
        const { api: sourceApp } = await options.createSession({
            type: 'websocket', callbacks: {
                handleSubscription: options.sourceCallbacks?.handleSubscription ?? (async () => {
                    return { status: 'success', subscriptionId: (++subscriptionCount).toString() }
                }),
                handleRemoteOperation: options.sourceCallbacks?.handleRemoteOperation ?? (async () => {
                    return { status: 'success', result: [] }
                })
            }
        })
        await sourceApp.registerApp({ name: 'test.source', identify: true })

        const callsExecuted = [createResolvable<HandleRemoteCallOptions_v0>()]
        const { api: integrationApp } = await options.createSession({
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

    it('should execute an operation when a remote create matching a pk selector is detected', async ({ createSession }) => {
        const { sourceApp, integrationApp, callsExecuted } = await setupTest({ createSession })
        await integrationApp.createRecipe({
            integrateExisting: false,
            recipe: {
                select: {
                    placeholder: 'tag',
                    app: 'test.source',
                    remote: true,
                    collection: 'tags',
                    pk: ['url', 'name'],
                    where: { name: 'share' }
                },
                on: {
                    add: [
                        {
                            app: 'test.integration',
                            call: 'test',
                            args: { tag: { $logic: '$tag' }, tagName: { $logic: '$tag.pk.1' } }
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
                        { type: 'create', collection: 'tags', pk: ['foo.com/page-1', 'share'], values: {} }
                    ]
                }
            }
        })
        expect(await callsExecuted[0]).toEqual({
            call: 'test',
            args: { tag: { pk: ['foo.com/page-1', 'share'], values: {} }, tagName: 'share' }
        })
    })

    it('should ignore remote creates not matching a selector', async ({ createSession }) => {
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
                        { type: 'create', collection: 'tags', pk: 'one', values: { name: 'bla' } }
                    ]
                }
            }
        })

        expect(await Promise.race([
            callsExecuted[0].then(result => ({ type: 'success', result })),
            new Promise(resolve => setTimeout(resolve, 1000)).then(() => ({ type: 'timeout' }))
        ])).toEqual({ type: 'timeout' })
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

    it('should execute an operation when a remote remove matching a selector is detected', async ({ createSession }) => {
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
                    remove: [
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
                        { type: 'delete', collection: 'tags', pks: ['one', 'two'], where: { id: { $in: ['one', 'two'] } } }
                    ]
                }
            }
        })
        expect(await callsExecuted[0]).toEqual({
            call: 'test',
            args: { tag: { pk: 'one' } }
        })
        expect(await callsExecuted[1]).toEqual({
            call: 'test',
            args: { tag: { pk: 'two' } }
        })
    })

    it('should execute operations and store them in placeholders', async ({ createSession }) => {
        let remoteOperationArgs = null
        const { sourceApp, integrationApp, callsExecuted } = await setupTest({
            createSession,
            sourceCallbacks: {
                handleRemoteOperation: async (options) => {
                    remoteOperationArgs = options
                    return { status: 'success', result: { foo: 5, bar: 'test' } }
                }
            }
        })
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
                            placeholder: 'test',
                            operation: 'findObject' as 'findObject',
                            app: 'test.source',
                            remote: true,
                            collection: 'test',
                            where: { foo: 5, tag: { $logic: '$tag' } },
                        },
                        {
                            call: 'test',
                            app: 'test.integration',
                            args: { tag: { $logic: '$tag' }, test: { $logic: '$test' } }
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
            args: { test: { foo: 5, bar: 'test' }, tag: { pk: 'one', values: { name: 'share' } } }
        })
        expect(remoteOperationArgs).toEqual({
            sourceApp: '',
            operation: [
                'findObject',
                'test',
                { foo: 5, tag: { pk: "one", values: { name: 'share' } } }
            ]
        })
    })
})
