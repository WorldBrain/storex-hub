import yargs from 'yargs'
import io from 'socket.io-client'
import { createStorexHubSocketClient } from '../client'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { CommandArgs, CommandEndFunction, COMMAND_INFO, Commands } from './types'
import { COMMANDS } from './commands'
import { SingleArgumentOf } from '../types/utils'

export interface AppArgs {
    host: string
    port: number
    configPath: string
    outputType: 'human' | 'json'
    memoryOnly: boolean
    verbose: boolean
}

export class StorexCLI {
    readonly appIdentifier = 'io.worldbrain.storex.cli'
    logger = (...args: any[]) => console.log(...args)
    abort = (...args: any[]) => { console.error(...args); process.exit(1) }

    async createClient(socket: SocketIOClient.Socket, options: AppArgs) {
        const client = await createStorexHubSocketClient(socket)
        const existingAccessToken = !options.memoryOnly && await this.retrieveAccessToken(options.configPath)
        if (existingAccessToken) {
            const result = await client.identifyApp({
                name: this.appIdentifier,
                accessToken: existingAccessToken,
            })
            if (result.status !== 'success') {
                this.abort(`Could not identify CLI app using existing access token: ${result.status}`)
            }
        } else {
            const result = await client.registerApp({ name: this.appIdentifier, identify: true })
            if (result.status === 'success') {
                if (!options.memoryOnly) {
                    await this.storeAccessToken(options.configPath, result.accessToken)
                }
            } else {
                this.abort(`Could not register CLI app: ${result.status}`)
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

    end = async (args: SingleArgumentOf<CommandEndFunction> & { outputType: 'human' | 'json' }) => {
        const outputType = args.outputType ?? 'human'
        if (outputType === 'human') {
            if (args.message) {
                console.log(args.message)
            }
            if (args.object) {
                console.log(JSON.stringify(args.object, null, 4))
            }
        } else {
            delete args.outputType
            console.log(args)
        }

        process.exit(args.success ? 0 : 1)
    }

    async run(args: string[]) {
        const { commandArgs, appArgs } = parseArgs(args)
        if (!commandArgs?.command) {
            console.error(`No such command: ${args[0]}`)
            process.exit(1)
        }

        const socket = io(`http://${appArgs.host}:${appArgs.port}`)
        try {
            const client = await this.createClient(socket, appArgs)
            const end: CommandEndFunction = (args) => {
                return this.end({ ...args, outputType: appArgs.outputType })
            }
            const command = COMMANDS[commandArgs.command]
            await command(commandArgs as any, {
                client,
                end,
                getJSON: (args, key) => {
                    const serialized = args[key]
                    try {
                        return JSON.parse(serialized)
                    } catch (e) {
                        end({ success: false, message: `Invalid JSON for argument '${key}'` })
                    }
                }
            })
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

    let parser = yargs
        .scriptName('cli')
        .options({
            'config-path': {
                type: 'string',
                alias: 'c',
                default: 'cli.config.json'
            },
            'output-format': {
                type: 'string',
                default: 'human',
                choices: ['human', 'json'],
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
            'memory-only': {
                type: 'boolean',
                default: false
            },
        })

    for (const [commandName, commandInfo] of Object.entries(COMMAND_INFO)) {
        parser = parser.command({
            command: commandInfo.command,
            builder: subparser => {
                for (const [optionName, optionDescription] of Object.entries(commandInfo.options ?? [])) {
                    subparser = subparser.option(optionName, optionDescription)
                }
                return subparser
            },
            handler: commandHandler(commandName as keyof Commands)
        })
    }

    const appArgs: AppArgs = parser
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
