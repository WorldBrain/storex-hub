import { StorexHubApi_v0 } from "../public-api"

export type Command<Args> = (args: Args, input: { client: StorexHubApi_v0 }) => Promise<void>
export type Commands = { [Name in keyof CommandArgs]: Command<CommandArgs[Name]> }
export interface CommandArgs {
    'plugins:inspect': { path: string },
    'plugins:install': { path: string },
    'apps:config:set': { app: string, key: string, value: string },
    'apps:config:get': { app: string, key?: string },
}
