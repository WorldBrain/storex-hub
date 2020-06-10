import { StatefulUILogic, StatefulUIEvent, UIEventsFromHandlers } from '../../types'
import { UIEventHandler, UIMutation } from 'ui-logic-core'
import { loadInitial } from '../../utils/logic'
import { PluginOverviewHandlers, PluginOverviewState } from './types'
import { DisplayedPluginInfo } from "../../types/plugins"
import { PluginOverviewDependencies } from './types'

export type PluginOverviewEvents = StatefulUIEvent<UIEventsFromHandlers<PluginOverviewHandlers>>

type EventHandler<EventName extends keyof PluginOverviewEvents> = UIEventHandler<PluginOverviewState, PluginOverviewEvents, EventName>

export class PluginOverviewLogic extends StatefulUILogic<PluginOverviewState, PluginOverviewEvents> {
    timeout?: ReturnType<typeof setTimeout>

    constructor(public dependencies: PluginOverviewDependencies) {
        super()
    }

    getInitialState(): PluginOverviewState {
        return {
            loadState: 'pristine',
            installedPlugins: [],
            availablePlugins: [],
        }
    }

    init: EventHandler<'init'> = async () => {
        await loadInitial<PluginOverviewState>(this, async () => {
            const client = await this.dependencies.services.storexHub.getClient()
            const listResult = await client.listPlugins()
            if (listResult.status !== 'success') {
                this.emitMutation({ loadError: { $set: listResult.status } })
                throw new Error(listResult.status)
            }

            const enrichedPlugins = listResult.plugins.map(plugin => {
                const status = listResult.state[plugin.identifier].status
                const installed = status === "enabled" || status === "disabled"
                return { ...plugin, status, installed }
            })
            const installedPlugins: PluginOverviewState['installedPlugins'] = enrichedPlugins.filter(plugin => {
                return plugin.installed
            })
            const availablePlugins: PluginOverviewState['installedPlugins'] = enrichedPlugins.filter(plugin => {
                return !plugin.installed
            })
            this.emitMutation({
                installedPlugins: { $set: installedPlugins },
                availablePlugins: { $set: availablePlugins }
            })
        })
    }

    installPlugin: EventHandler<'installPlugin'> = async ({ event, previousState }) => {
        console.log('install plugin')
        const updated = (status: DisplayedPluginInfo['status']) =>
            this._updatedPluginStatus(previousState, 'availablePlugins', event.identifier, status)

        this.emitMutation(updated('installing'))
        try {
            const client = await this.dependencies.services.storexHub.getClient()
            const result = await client.installPlugin({ identifier: event.identifier })

            if (result.status === 'success') {
                return updated('successfully-installed')
            }
            if (result.status === 'installed-but-errored') {
                return updated('installed-but-errored')
            }
            return updated('could-not-install')
        } catch (e) {
            this.emitMutation(updated('could-not-install'))
            throw e
        }
    }

    enablePlugin: EventHandler<'enablePlugin'> = async ({ previousState, event }) => {
        const updated = (status: DisplayedPluginInfo['status']) =>
            this._updatedPluginStatus(previousState, 'installedPlugins', event.identifier, status)

        // const client = await this.dependencies.services.storexHub.getClient()
        // const result = await client.({ identifier: event.identifier })

        this.emitMutation(updated('enabling'))
        await new Promise(resolve => setTimeout(resolve, 1000))
        return updated('enabled')
    }

    disablePlugin: EventHandler<'disablePlugin'> = async ({ previousState, event }) => {
        const updated = (status: DisplayedPluginInfo['status']) =>
            this._updatedPluginStatus(previousState, 'installedPlugins', event.identifier, status)

        this.emitMutation(updated('disabling'))
        await new Promise(resolve => setTimeout(resolve, 1000))
        return updated('disable-pending')
    }

    _updatedPluginStatus(state: PluginOverviewState, key: 'installedPlugins' | 'availablePlugins', identifier: string, newStatus: DisplayedPluginInfo['status']) {
        const pluginIndex = state[key].findIndex(plugin => plugin.identifier === identifier)
        const mutation: UIMutation<PluginOverviewState> = {
            [key]: {
                [pluginIndex]: {
                    status: { $set: newStatus }
                }
            }
        } as any
        return mutation
    }
}
