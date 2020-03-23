import { existsSync, readFileSync, writeFileSync } from 'fs'
import some from 'lodash/some'
import mapKeys from 'lodash/mapKeys'
import io from 'socket.io-client'
const GistClient = require("gist-client")
import { createStorexHubSocketClient } from '../../ts/client'
import { StorexHubApi_v0 } from '../../ts/public-api'
import { StorageOperationChangeInfo } from '@worldbrain/storex-middleware-change-watcher/lib/types'

interface Settings {
    githubToken: string
}

type TagsByPage = {
    [url: string]: Array<string>
}
interface Page {
    url: string
    fullUrl: string
    fullTitle: string
}
interface StorageData {
    pages: Page[]
    tagsByPage: TagsByPage
}

const APP_NAME = 'memex-gist-sharer'
const SHARE_TAG_NAME = 'share-gist'
const SPECIAL_GIST_FILENAME = 'my_memex.md'

export async function handleMemexStorageChange(info: StorageOperationChangeInfo<'post'>, options: {
    client: StorexHubApi_v0
    settings: Settings,
}) {
    if (!some(info.changes, change => change.collection === 'tags')) {
        return
    }

    const data = await fetchStorageData(options)
    const gist = renderGist(data)
    await createOrUpdateGist(gist, options)
}

export async function fetchStorageData(options: {
    client: StorexHubApi_v0
}): Promise<StorageData> {
    const tagsResponse = await options.client.executeRemoteOperation({
        app: 'memex',
        operation: ['findObjects', 'tags', { name: SHARE_TAG_NAME }]
    })
    if (tagsResponse.status !== 'success') {
        throw new Error(`Error while fetching URLs for tag '${SHARE_TAG_NAME}'`)
    }
    const pageUrls = (tagsResponse.result as Array<{ url: string }>).map(tag => tag.url)

    const pageTagsResponse = await options.client.executeRemoteOperation({
        app: 'memex',
        operation: ['findObjects', 'tags', { url: { $in: pageUrls } }]
    })
    if (pageTagsResponse.status !== 'success') {
        throw new Error(`Error while all tags for shared pages`)
    }

    const pagesRespone = await options.client.executeRemoteOperation({
        app: 'memex',
        operation: ['findObjects', 'pages', { url: { $in: pageUrls } }]
    })
    if (pagesRespone.status !== 'success') {
        throw new Error(`Error while fetching info for tagged pages from Memex`)
    }

    const tagsByPage: TagsByPage = {}
    for (const tag of pageTagsResponse.result) {
        tagsByPage[tag.url] = tagsByPage[tag.url] || []
        tagsByPage[tag.url].push(tag.name)
    }

    return { tagsByPage, pages: pagesRespone.result }
}

export function renderGist(data: StorageData) {
    const lines = ['# My shared pages', '']
    lines.push(...data.pages.map(page => {
        const pageTags = data.tagsByPage[page.url]
        const selectedTags = pageTags.filter(tag => tag !== SHARE_TAG_NAME)
        const renderedTags = selectedTags.length ? `(${selectedTags.join(', ')})` : ''
        const renderedLink = `[${page.fullTitle}](${page.fullUrl})`
        return `  * ${renderedLink} ${renderedTags}`
    }))
    lines.push('')
    return lines.join('\n')
}

export async function createOrUpdateGist(content: string, options: {
    settings: Settings
}) {
    const gistClient = new GistClient()
    gistClient.setToken(options.settings.githubToken)
    const gistId = await getSpecialGistId(gistClient)
    if (!gistId) {
        await gistClient.create({
            files: {
                [SPECIAL_GIST_FILENAME]: {
                    content
                }
            },
            description: "Pages shared through Memex",
            public: true
        })
    } else {
        await gistClient.update(gistId, {
            files: {
                [SPECIAL_GIST_FILENAME]: {
                    content
                }
            }
        })
    }
}

async function getSpecialGistId(gistClient: any) {
    const gists = await gistClient.getAll({
        filterBy: [
            { public: true },
            { filename: SPECIAL_GIST_FILENAME },
        ]
    })

    return gists.length ? gists[0].id : null
}

function requireEnvVar(key: string) {
    const value = process.env[key]
    if (!value) {
        console.error(`Didn't get a ${key}`)
        process.exit(1)
    }
    return value
}

export async function registerOrIdentify(client: StorexHubApi_v0, options: { configPath: string }) {
    console.log(`Identifying with Storex Hub as '${APP_NAME}'`)

    const hasConfig = existsSync(options.configPath)
    const existingConfig = hasConfig ? JSON.parse(readFileSync(options.configPath).toString()) : null
    if (existingConfig && existingConfig['accessToken']) {
        const identificationResult = await client.identifyApp({
            name: APP_NAME,
            accessToken: existingConfig['accessToken']
        })
        if (identificationResult.status !== 'success') {
            throw new Error(`Couldn't identify app '${APP_NAME}': ${identificationResult.status}`)
        }
    } else {
        const registrationResult = await client.registerApp({
            name: APP_NAME,
            identify: true,
        })
        if (registrationResult.status === 'success') {
            writeFileSync(options.configPath, JSON.stringify({
                accessToken: registrationResult.accessToken
            }))
        } else {
            throw new Error(`Couldn't register app '${APP_NAME}'": ${registrationResult.status}`)
        }
    }

    console.log(`Successfuly identified with Storex Hub as '${APP_NAME}'`)
}

async function tryToSubscribeToMemex(client: StorexHubApi_v0) {
    const subscriptionResult = await client.subscribeToEvent({
        request: {
            type: 'storage-change',
            app: 'memex',
            collections: ['tags'],
        }
    })
    if (subscriptionResult.status === 'success') {
        console.log('Successfuly subscribed to Memex storage changes')
    } else {
        console.log('Could not subscribe to Memex storage changes (yet?):', subscriptionResult.status)
    }
}

async function initializeSession(client: StorexHubApi_v0, options: { configPath: string }) {
    await registerOrIdentify(client, options)
    await tryToSubscribeToMemex(client)
    await client.subscribeToEvent({
        request: {
            type: 'app-availability-changed'
        }
    })
}

export async function main(options?: {
    port?: number
}) {
    const githubToken = requireEnvVar('GITHUB_TOKEN')
    const configPath = requireEnvVar('CONFIG_PATH')

    const socket = io(`http://localhost:${options?.port || 3000}`)
    console.log('Connecting to Storex Hub')
    const client = await createStorexHubSocketClient(socket, {
        callbacks: {
            handleEvent: async ({ event }) => {
                if (event.type === 'storage-change' && event.app === 'memex') {
                    handleMemexStorageChange(event.info, {
                        client: client,
                        settings: {
                            githubToken,
                        }
                    })
                } else if (event.type === 'app-availability-changed' && event.app === 'memex') {
                    console.log('Changed Memex availability:', event.availability ? 'up' : 'down')
                    if (event.availability) {
                        tryToSubscribeToMemex(client)
                    }
                }
            },
        },
    })
    console.log('Connected to Storex Hub')
    await initializeSession(client, { configPath })

    socket.on('reconnect', async () => {
        console.log('Re-connected to Storex Hub')
        await initializeSession(client, { configPath })
    })
    socket.on('disconnect', async (reason: string) => {
        console.log('Lost connection to Storex Hub:', reason)
    })

    console.log('Setup complete')
}

main()
