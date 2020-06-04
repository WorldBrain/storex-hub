import { StorexHubApi_v0 } from "../public-api"
import yargs from "yargs"

export type Command<Args> = (args: Args, input: {
    client: StorexHubApi_v0,
    getJSON: (args: { [key: string]: any }, key: string) => any
    end: CommandEndFunction
}) => Promise<void>
export type CommandEndFunction = (params: {
    success: boolean
    message?: string
    object?: any
}) => Promise<never>

export type Commands = { [Name in keyof CommandArgs]: Command<CommandArgs[Name]> }
export type CommandInfo = { [Name in keyof CommandArgs]: { command: string, describe: string, options?: { [name: string]: yargs.Options } } }
export interface CommandArgs {
    'calls:execute': { app: string, call: string, args: string },
    'operations:execute': { app: string, remote?: boolean, integrateExisting?: boolean, operation: string },
    'recipes:create': { definition: string },
    'plugins:list': {},
    'plugins:inspect': { path: string },
    'plugins:install': { path: string },
    'apps:config:set': { app: string, key: string, value: string },
    'apps:config:get': { app: string, key?: string },
}
export const COMMAND_INFO: CommandInfo = {
    'calls:execute': {
        command: 'calls:execute <app> <call> <args>',
        describe: 'Execute call',
    },
    'operations:execute': {
        command: 'operations:execute [--remote] <app> <operation>',
        describe: 'Execute operation, possibly remote',
        options: {
            remote: {
                boolean: true,
                default: false,
            },
        }
    },
    'recipes:create': {
        command: 'recipes:create [--integrate-existing] <definition>',
        describe: 'Create an Integration Recipe',
        options: {
            'integrate-existing': {
                boolean: true,
                default: false,
            }
        }
    },
    'plugins:list': {
        command: 'plugin:list',
        describe: 'List plugins',
    },
    'plugins:inspect': {
        command: 'plugin:inspect <path>',
        describe: 'Install a new plugin',
    },
    'plugins:install': {
        command: 'plugin:install <path>',
        describe: 'Install a new plugin',
    },
    'apps:config:set': {
        command: 'apps:config:set <app> <key> <value>',
        describe: 'Modify an app setting',
    },
    'apps:config:get': {
        command: 'apps:config:get <app> [<key>]',
        describe: 'Modify an app setting',
    },
} 
