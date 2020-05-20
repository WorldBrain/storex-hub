import { spawn } from "child_process"
import { join } from "path"
import del from 'del'
import io from 'socket.io-client'
import { RuntimeConfig, main } from "../main"
import { StorexHubApi_v0, StorexHubCallbacks_v0 } from "../public-api"
import { Application } from "../application"
import { createStorexHubSocketClient } from '../client'
import { create } from "domain"

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
                it(testDescription, async () => {
                    let created: { application: Application, cleanup?: () => Promise<void> } | undefined
                    try {
                        await test({
                            isStandalone: false,
                            start: async (startOptions) => {
                                if (!created) {
                                    created = await createApplication({ ...startOptions, isStandalone })
                                }

                                return { createSession: async sessionOptions => ({ api: await created!.application.api(sessionOptions as any) }) }
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

async function createApplication(options: { isStandalone: boolean, runtimeConfig: RuntimeConfig }): Promise<{ application: Application, cleanup?: () => Promise<void> }> {
    if (!options.isStandalone) {
        const { application } = await main({
            withoutServer: true,
            runtimeConfig: options.runtimeConfig
        })
        return { application }
    }

    const execPath = join(STANDALONE_DIR, 'storex-hub')

    const child = spawn(execPath, [], {
        stdio: 'inherit',
        env: {
            NO_AUTO_LAUCH: 'true',
            DB_PATH: options.runtimeConfig.dbPath,
            PLUGINS_DIR: options.runtimeConfig.pluginsDir,
        }
    })
    const application = {
        api: async (options: { callbacks: StorexHubCallbacks_v0 }) => {
            const socket = io('http://localhost:50483', { forceNew: true })
            return createStorexHubSocketClient(socket, options)
        }
    } as Application
    return {
        application,
        cleanup: () => {
            return new Promise(resolve => {
                child.once('exit', () => {
                    resolve()
                })
                child.kill()
            })
        }
    }
}
