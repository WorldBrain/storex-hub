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

export async function main(options?: {
    port?: number
}) {
    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
        console.error(`Didn't get a GITHUB_TOKEN`)
        return
    }

    const socket = io(`http://localhost:${options?.port || 3000}`)
    const client = await createStorexHubSocketClient(socket, {
        callbacks: {
            handleEvent: async ({ event }) => {
                if (event.type !== 'storage-change' || event.app !== 'memex') {
                    return
                }

                handleMemexStorageChange(event.info, {
                    client: client,
                    settings: {
                        githubToken,
                    }
                })
            },
        },
    })
    await client.registerApp({
        name: 'memex-gist-sharer',
        identify: true,
    })
    const subscriptionResult = await client.subscribeToEvent({
        request: {
            type: 'storage-change',
            app: 'memex',
            collections: ['tags'],
        }
    })
    if (subscriptionResult.status !== 'success') {
        throw new Error('Subscription was not successful: ' + subscriptionResult.status)
    }

    console.log('Setup complete')
}

main()
