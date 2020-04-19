import { PluginEntryFunction, PluginInterface } from "@worldbrain/storex-hub-interfaces/lib/plugins";
import { CollectionDefinitionMap } from "@worldbrain/storex";

export interface SelfTestPlugin extends PluginInterface {
    running: boolean
    foundObjects?: any
}

const collectionDefinitions: CollectionDefinitionMap = {
    test: {
        version: new Date(),
        fields: {
            foo: { type: 'string' }
        }
    }
}

export const main: PluginEntryFunction = async (input) => {
    const plugin: SelfTestPlugin = {
        running: false,
        start: async () => {
            const api = await input.getApi()
            await api.updateSchema({ schema: { collectionDefinitions } })
            await api.executeOperation({ operation: ['createObject', 'test', { foo: 'bla' }] })
            plugin.foundObjects = await api.executeOperation({ operation: ['findObjects', 'test', {}] })
            plugin.running = true
        },
        stop: async () => {
            plugin.running = true
        }
    }
    return plugin
}
