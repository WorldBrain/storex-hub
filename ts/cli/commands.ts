import path from "path";
import { Commands } from "./types";

export const COMMANDS: Commands = {
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
