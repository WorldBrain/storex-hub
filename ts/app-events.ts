import uuid from 'uuid/v4'
import { EventEmitter } from "events"
import TypedEmitter from 'typed-emitter'
import * as api from "./public-api";
import { SubscribeToEventResult_v0, StorexHubCallbacks_v0, RemoteSubscriptionRequest_v0, ClientEvent } from './public-api'
import { isRemoteSubscriptionRequest } from './public-api/utils'
import { RemoteSessions } from './remote-sessions'
import { IdentifiedApp } from './types';

export class AppEvents {
    private appEvents: { [identifier: string]: EventEmitter } = {}
    private subscriptions: { [subscriptionId: string]: { unsubscribe: () => Promise<void> } } = {}
    private events = new EventEmitter() as TypedEmitter<{
        'app-availability-changed': (event: { app: string, availability: boolean }) => void
    }>

    constructor(private remoteSessions: RemoteSessions) {
    }

    initializeApp(app: Pick<IdentifiedApp, 'identifier'>) {
        this.appEvents[app.identifier] = new EventEmitter()
        this.events.emit('app-availability-changed', {
            app: app.identifier,
            availability: true,
        })
    }

    cleanupApp(app: Pick<IdentifiedApp, 'identifier'>) {
        if (this.appEvents[app.identifier]) {
            this.appEvents[app.identifier].removeAllListeners()
            delete this.appEvents[app.identifier]
        }
        this.events.emit('app-availability-changed', {
            app: app.identifier,
            availability: false,
        })
    }

    _registerSubscription = (unsubscribe: () => Promise<void>) => {
        const subscriptionId = uuid()
        this.subscriptions[subscriptionId] = { unsubscribe }
        return subscriptionId
    }

    async subscribeToEvent(identifiedApp: IdentifiedApp, options: api.SubscribeToEventOptions_v0): Promise<api.SubscribeToEventResult_v0> {
        const { request } = options
        const remoteSession = this.remoteSessions.getRemoteSession(identifiedApp.identifier)
        if (!remoteSession) {
            throw new Error(`App '${identifiedApp.identifier}' wanted to subscribe to event, but doesn't have a remote session`)
        }

        if (isRemoteSubscriptionRequest(request)) {
            return this.subsribeToRemoteEvent(request, {
                handleEvent: async ({ event }) => remoteSession.handleEvent?.({ event }),
            })
        }

        if (request.type === 'app-availability-changed') {
            const handler = (event: { app: string, availability: boolean }) => {
                return remoteSession.handleEvent?.({
                    event: {
                        type: 'app-availability-changed',
                        ...event,
                    }
                })
            }

            this.events.addListener('app-availability-changed', handler)
            const subscriptionId = this._registerSubscription(async () => {
                this.events.removeListener('app-availability-changed', handler)
            })
            return { status: 'success', subscriptionId }
        }

        return { status: 'unsupported-event' }
    }

    async unsubscribeFromEvent(options: api.UnsubscribeFromEventOptions_v0): Promise<api.UnsubscribeFromEventResult_v0> {
        const subscription = this.subscriptions[options.subscriptionId]
        if (!subscription) {
            throw new Error(`Got invalid subscription ID trying to unsubscribe from event`)
        }

        await subscription.unsubscribe()
        delete this.subscriptions[options.subscriptionId]
    }

    async emitEvent(identifiedApp: IdentifiedApp, options: api.EmitEventOptions_v0): Promise<api.EmitEventResult_v0> {
        const appEvents = this.appEvents[identifiedApp.identifier]
        if (!appEvents) {
            throw new Error(`App ${identifiedApp.identifier} is not a remote app`)
        }

        const { event } = options
        if (options.synchronous) {
            await Promise.all(appEvents.listeners(options.event.type).map(handler => {
                return handler({ ...event, app: identifiedApp.identifier })
            }))
        } else {
            appEvents.emit(options.event.type, {
                ...event,
                app: identifiedApp.identifier
            })
        }
    }

    async subsribeToRemoteEvent(request: RemoteSubscriptionRequest_v0, options: {
        handleEvent: StorexHubCallbacks_v0['handleEvent']
    }): Promise<SubscribeToEventResult_v0> {
        const remoteSession = this.remoteSessions.getRemoteSession(request.app)
        const appEvents = this.appEvents[request.app]
        if (!remoteSession || !appEvents) {
            return { status: 'app-not-found' }
        }

        const subscriptionResult = await remoteSession.handleSubscription?.({ request })
        if (!subscriptionResult || subscriptionResult.status === 'not-implemented') {
            return { status: 'app-not-supported' }
        }
        const externalSubscriptionId = subscriptionResult.subscriptionId

        const handler = (event: ClientEvent) => {
            return options.handleEvent?.({ event })
        }
        appEvents.addListener(request.type, handler)

        const unsubscribe = async () => {
            appEvents.removeListener(request.type, handler)
            await remoteSession.handleUnsubscription?.({ subscriptionId: externalSubscriptionId })
        }
        const subscriptionId = await this._registerSubscription(unsubscribe)
        return { status: 'success', subscriptionId }
    }
}

