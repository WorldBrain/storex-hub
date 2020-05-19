import { spawn } from "child_process"
import { join } from "path"
import del from 'del'
import io from 'socket.io-client'
import { RuntimeConfig, main } from "../main"
import { StorexHubApi_v0, StorexHubCallbacks_v0 } from "../public-api"
import { Application } from "../application"
import { createStorexHubSocketClient } from '../client'
import { create } from "domain"

export interface TestEntryPoint {
    createSession: (options: {
        callbacks?: StorexHubCallbacks_v0
    }) => Promise<{
        api: StorexHubApi_v0
        close: () => Promise<void>
    }>
    application?: Application
    cleanup?: () => Promise<void>
}

export interface EntryPointTestContext {
    isStandalone: boolean
    start(options: { runtimeConfig: RuntimeConfig }): Promise<{ createSession: (options?: { callbacks?: StorexHubCallbacks_v0 }) => Promise<{ api: StorexHubApi_v0 }> }>
    getApplication: () => Application | null
}
export type EntryPointSuite = (options: { it: EntryPointTestFactory }) => void
export type EntryPointTest = (context: EntryPointTestContext) => Promise<void>
export type EntryPointTestFactory = (description: string, test: EntryPointTest) => void

const STANDALONE_DIR = join(__dirname, '..', '..', 'build', 'linux')

export function createEntryPointTestSuite(suiteDescription: string, suite: EntryPointSuite) {
    const isStandalone = process.env.TEST_STANDALONE === 'true'
    describe(suiteDescription, () => {
        suite({
            it: (testDescription: string, test) => {
                it(testDescription, async function () {
                    this.timeout(5000)
                    let created: TestEntryPoint | undefined
                    try {
                        await test({
                            isStandalone,
                            start: async (startOptions) => {
                                if (!created) {
                                    const create = isStandalone ? createStandaloneEntryPoint : createInProcessEntryPoint
                                    created = await create(startOptions)
                                }

                                return { createSession: async sessionOptions => await created!.createSession(sessionOptions as any) }
                            },
                            getApplication: () => !isStandalone ? created?.application ?? null : null,
                        })
                    } finally {
                        created?.cleanup?.()
                    }
                })
            }
        })
    })
}

export async function createInProcessEntryPoint(options: { runtimeConfig: RuntimeConfig }): Promise<TestEntryPoint> {
    const { application } = await main({
        withoutServer: true,
        runtimeConfig: options.runtimeConfig
    })
    return {
        application,
        createSession: async sessionOptions => {
            return {
                api: await application.api({
                    callbacks: sessionOptions.callbacks as any
                }),
                close: async () => { }
            }
        }
    }
}

export async function createStandaloneEntryPoint(options: { runtimeConfig: RuntimeConfig }): Promise<TestEntryPoint> {
    const execPath = join(STANDALONE_DIR, 'storex-hub')

    const env = {
        NO_AUTO_LAUCH: 'true',
        DB_PATH: options.runtimeConfig.dbPath,
        PLUGINS_DIR: options.runtimeConfig.pluginsDir,
    }
    const child = spawn(execPath, [], {
        stdio: 'inherit',
        env
    })
    const waitForExit = new Promise((resolve, reject) => {
        let errored = false
        child.once('exit', (code, signal) => {
            if (!errored) {
                resolve()
            }
        })
        child.once('error', (err) => {
            errored = true
            reject(err)
        })
    })
    await new Promise(resolve => setTimeout(resolve, 2000))
    return {
        createSession: async (options: { callbacks?: Partial<StorexHubCallbacks_v0> }) => {
            const socket = io('http://localhost:50483', { forceNew: true })
            return {
                api: await createStorexHubSocketClient(socket, options),
                close: async () => { }
            }
        },
        cleanup: async () => {
            console.log('ceanefea')
            child.kill()
            await waitForExit
        }
    }
}
