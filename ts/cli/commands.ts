import path from "path";
import { Commands } from "./types";

export const COMMANDS: Commands = {
    "calls:execute": async (args, { client }) => {
        const output = args.output ?? 'human'
        console.log({
            app: args.app,
            call: args.call,
            args: JSON.parse(args.args),
        })
        const response = await client.executeRemoteCall({
            app: args.app,
            call: args.call,
            args: JSON.parse(args.args),
        })
        if (output === 'json') {
            console.log(response)
            process.exit(response.status === 'success' ? 0 : 1)
        }
        if (response.status === 'success') {
            console.log('Call execute successfully! Result:')
            console.log(response.result)
        } else if (response.status === 'app-not-found') {
            console.error(`App not found: ${args.app}`)
        } else if (response.status === 'call-not-found') {
            console.error(`No such call in app '${args.app}': ${args.call}`)
        } else if (response.status === 'internal-error') {
            console.error(`Internal error (${response.errorStatus}): ${response.errorText}`)
        } else {
            console.error(`Unknown error: ${response.status}`)
        }
    },
    'apps:config:set': async (args, { client }) => {
        const response = await client.setAppSettings({
            app: args.app,
            updates: { [args.key]: args.value },
        })
        if (response.status === 'success') {
            console.log('Config update successful!')
        } else {
            console.error(`Could not update app config: ${response.status}`)
        }
    },
    'apps:config:get': async (args, { client }) => {
        const response = await client.getAppSettings({
            app: args.app,
            keys: args.key ? [args.key] : 'all',
        })
        if (response.status === 'success') {
            console.log(response.settings)
        } else {
            console.error(`Could retrieve app config: ${response.status}`)
        }
    },
    'plugins:list': async (args, { client }) => {
        console.log(await client.listPlugins())
    },
    'plugins:inspect': async (args, { client }) => {
        const location = path.resolve(args.path)
        // await client.inspectPlugin({ location })
    },
    'plugins:install': async (args, { client }) => {
        const location = path.resolve(args.path)
        const response = await client.installPlugin({ location })
        if (response.status === 'success') {
            console.log('Plugin install successful!')
        } else {
            console.error(`Could not install plugin ${args.path}: ${response.status}`)
        }
    },
}
