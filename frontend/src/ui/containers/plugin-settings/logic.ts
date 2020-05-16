import { StatefulUILogic, StatefulUIEvent, UIEventsFromHandlers } from '../../types'
import { PluginSettingsState, PluginSettingsDependencies, PluginSettingsHandlers } from './types'
import { UIEventHandler } from 'ui-logic-core'
import { loadInitial, executeUITask } from '../../utils/logic'
import { translateSettingsDescriptionToUI } from './utils'
import { SettingsDescription } from '@worldbrain/storex-hub-interfaces/lib/settings'

export type PluginSettingEvents = StatefulUIEvent<UIEventsFromHandlers<PluginSettingsHandlers>>

type EventHandler<EventName extends keyof PluginSettingEvents> = UIEventHandler<PluginSettingsState, PluginSettingEvents, EventName>

export class PluginSettingsLogic extends StatefulUILogic<PluginSettingsState, PluginSettingEvents> {
    timeout?: ReturnType<typeof setTimeout>

    constructor(public dependencies: PluginSettingsDependencies) {
        super()
    }

    getInitialState(): PluginSettingsState {
        return {
            loadState: 'pristine',
            saveState: 'pristine',
            name: 'Loading...',
            settings: { sections: [], fields: {} },
            tagSuggestions: {},
        }
    }

    init: EventHandler<'init'> = async () => {
        await loadInitial<PluginSettingsState>(this, async () => {
            const client = await this.dependencies.services.storexHub.getClient()
            const [settingsDescription, pluginInfo, settingValues] = await Promise.all<SettingsDescription, { name: string }, { [key: string]: any }>([
                (async () => {
                    const result = await client.getAppSettingsDescription({ app: this.dependencies.appIdentifier })
                    if (result.status !== 'success') {
                        throw new Error(result.status)
                    }
                    return result.description
                })(),
                (async () => {
                    const result = await client.inspectPlugin({
                        identifier: this.dependencies.appIdentifier,
                    })
                    if (result.status !== 'success') {
                        throw new Error(result.status)
                    }
                    return result.pluginInfo
                })(),
                (async () => {
                    const result = await client.getAppSettings({
                        app: this.dependencies.appIdentifier,
                        keys: 'all',
                    })
                    if (result.status !== 'success') {
                        throw new Error(result.status)
                    }
                    return result.settings
                })(),
            ])
            const settings = translateSettingsDescriptionToUI(settingsDescription)
            for (const [key, value] of Object.entries(settingValues)) {
                settings.fields[key].value = value
            }
            this.emitMutation({
                name: { $set: pluginInfo.name },
                settings: {
                    $set: settings
                }
            })
        })
    }

    changeTextField: EventHandler<'changeTextField'> = async ({ event }) => {
        return {
            settings: { fields: { [event.field]: { value: { $set: event.newValue } } } }
        }
    }

    changeBooleanField: EventHandler<'changeBooleanField'> = async ({ event }) => {
        return {
            settings: { fields: { [event.field]: { value: { $set: event.newValue } } } }
        }
    }

    addExistingTag: EventHandler<'addExistingTag'> = ({ event }) => {
        return {
            settings: { fields: { [event.field]: { value: { $push: [event.tag] } } } }
        }
    }

    queryTags: EventHandler<'queryTags'> = async ({ event }) => {
        if (this.timeout) {
            clearTimeout(this.timeout);
            delete this.timeout;
        }

        this.timeout = setTimeout(() => {
            delete this.timeout
            this.emitMutation({
                tagSuggestions: { [event.field]: { $set: [{ id: 1, name: 'mangos!!' }] } }
            })
        })
    }

    save: EventHandler<'save'> = async ({ previousState }) => {
        await executeUITask<PluginSettingsState, 'saveState', void>(this, 'saveState', async () => {
            const updates: { [key: string]: any } = {}
            for (const [id, field] of Object.entries(previousState.settings.fields)) {
                updates[id] = field.value
            }

            const client = await this.dependencies.services.storexHub.getClient()
            await client.setAppSettings({
                app: this.dependencies.appIdentifier,
                updates
            })
            this.dependencies.services.router.goTo('overview')
        })
    }
}
