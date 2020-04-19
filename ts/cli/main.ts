import yargs from 'yargs'
import io from 'socket.io-client'
import { createStorexHubSocketClient } from '../client'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { CommandArgs } from './types'
import { COMMANDS } from './commands'

export interface AppArgs {
    host: string
    port: number
    configPath: string
    memoryOnly: boolean
    verbose: boolean
}

export class StorexCLI {
    readonly appIdentifier = 'io.worldbrain.storex.cli'
    logger = (...args: any[]) => console.log(...args)

    async createClient(socket: SocketIOClient.Socket, options: AppArgs) {
        const client = await createStorexHubSocketClient(socket)
        const existingAccessToken = !options.memoryOnly && await this.retrieveAccessToken(options.configPath)
        if (existingAccessToken) {
            await client.identifyApp({
                name: this.appIdentifier,
                accessToken: existingAccessToken,
            })
        } else {
            const result = await client.registerApp({ name: this.appIdentifier, identify: true })
            if (result.status === 'success') {
                if (!options.memoryOnly) {
                    await this.storeAccessToken(options.configPath, result.accessToken)
                }
            } else {
                throw new Error(`Could not register CLI app: ${result.status}`)
            }
        }
        return client
    }

    async retrieveAccessToken(configPath: string) {
        if (!existsSync(configPath)) {
            return null
        }

        const config = JSON.parse(readFileSync(configPath).toString())
        return config['accessToken']
    }

    async storeAccessToken(configPath: string, accessToken: string) {
        console.log({ accessToken })
        writeFileSync(configPath, JSON.stringify({ accessToken }))
    }

    async run(args: string[]) {
        const { commandArgs, appArgs } = parseArgs(args)
        if (!commandArgs?.command) {
            return
        }

        const socket = io(`http://${appArgs.host}:${appArgs.port}`)
        try {
            const client = await this.createClient(socket, appArgs)
            const command = COMMANDS[commandArgs.command]
            await command(commandArgs as any, { client })
        } finally {
            socket.close()
        }
    }
}

export function parseArgs(args: string[]): { appArgs: AppArgs, commandArgs: (CommandArgs & { command: keyof CommandArgs }) | null } {
    let commandArgs: CommandArgs | null = null
    const commandHandler = (command: keyof CommandArgs) => (args: yargs.Arguments) => {
        args = { ...args, command }
        delete args['_']
        delete args['$0']
        commandArgs = args as any
    }

    const appArgs: AppArgs = yargs
        .scriptName('cli')
        .options({
            configPath: {
                type: 'string',
                alias: '-c',
                default: 'cli.config.json'
            },
            host: {
                type: 'string',
                default: 'localhost'
            },
            port: {
                type: 'number',
                default: process.env.NODE_ENV === 'production' ? 50482 : 50483
            },
            verbose: {
                type: 'boolean',
                default: false
            },
            memoryOnly: {
                type: 'boolean',
                default: false
            },
        })
        .command({
            command: 'plugin:inspect <path>',
            describe: 'Install a new plugin',
            handler: commandHandler('plugins:inspect')
        })
        .command({
            command: 'plugin:install <path>',
            describe: 'Install a new plugin',
            handler: commandHandler('plugins:install')
        })
        .command({
            command: 'apps:config:set <app> <key> <value>',
            describe: 'Modify an app setting',
            handler: commandHandler('apps:config:set')
        })
        .command({
            command: 'apps:config:get <app> [<key>]',
            describe: 'Modify an app setting',
            handler: commandHandler('apps:config:get')
        })
        .help()
        .parse(args) as any

    return { appArgs, commandArgs }
}

export async function main() {
    const cli = new StorexCLI()
    await cli.run(process.argv.slice(2))
}

if (require.main === module) {
    main().catch(e => console.error(e))
}
