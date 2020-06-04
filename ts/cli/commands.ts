import path from "path";
import { Commands } from "./types";

export const COMMANDS: Commands = {
    "calls:execute": async (args, { client, end, getJSON }) => {
        const response = await client.executeRemoteCall({
            app: args.app,
            call: args.call,
            args: getJSON(args, 'args'),
        })
        if (response.status === 'success') {
            return end({
                success: response.status === 'success',
                message: 'Call execute successfully!',
                object: response,
            })
        }

        if (response.status === 'app-not-found') {
            end({ success: false, message: `App not found: ${args.app}` })
        } else if (response.status === 'call-not-found') {
            end({ success: false, message: `No such call in app '${args.app}': ${args.call}` })
        } else if (response.status === 'internal-error') {
            end({ success: false, message: `Internal error (${response.errorStatus}): ${response.errorText}` })
        } else {
            end({ success: false, message: `Unknown error: ${response.status}`, object: response })
        }
    },
    'operations:execute': async (args, { client, end }) => {
        const operation = JSON.parse(args.operation)
        if (args.remote) {
            const response = await client.executeRemoteOperation({ app: args.app, operation })
            if (response.status !== 'success') {
                return end({ success: false, message: `Error during remote operation execution: ${response.status}`, object: response })
            }
            end({ success: true, message: 'Command execution successful!', object: response.result })
        } else {
            end({ success: false, message: 'Non-remote operation executions are not implemented yet' })
        }
    },
    'recipes:create': async (args, { client, end, getJSON }) => {
        const definition = getJSON(args, 'definition')
        const response = await client.createRecipe({ integrateExisting: false, recipe: definition })
        if (response.status === 'success') {
            end({ success: true, message: 'Recipe successfully added!' })
        } else {
            end({ success: false, message: `Unknown error: ${response.status}`, object: response })
        }
    },
    'apps:config:set': async (args, { client, end }) => {
        const response = await client.setAppSettings({
            app: args.app,
            updates: { [args.key]: args.value },
        })
        if (response.status === 'success') {
            end({ success: true, message: 'Config update successful!' })
        } else {
            end({ success: false, message: `Could not update app config: ${response.status}` })
        }
    },
    'apps:config:get': async (args, { client, end }) => {
        const response = await client.getAppSettings({
            app: args.app,
            keys: args.key ? [args.key] : 'all',
        })
        if (response.status === 'success') {
            end({ success: true, object: response.settings })
        } else {
            end({ success: false, message: `Could retrieve app config: ${response.status}` })
        }
    },
    'plugins:list': async (args, { client, end }) => {
        end({ success: true, object: await client.listPlugins() })
    },
    'plugins:inspect': async (args, { client }) => {
        const location = path.resolve(args.path)
        // await client.inspectPlugin({ location })
    },
    'plugins:install': async (args, { client, end }) => {
        const location = path.resolve(args.path)
        const response = await client.installPlugin({ location })
        if (response.status === 'success') {
            end({ success: true, message: 'Plugin install successful!' })
        } else {
            end({ success: false, message: `Could not install plugin ${args.path}: ${response.status}` })
        }
    },
}
