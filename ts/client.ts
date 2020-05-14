import { StorexHubApi_v0, STOREX_HUB_API_v0, StorexHubCallbacks_v0, MethodDescription } from "./public-api";

export type StorexHubClientRequester<Result = any> = (url: string, options: {
    methodOptions: any
}) => Promise<{ result: Result }>

export async function createStorexHubClient(request: StorexHubClientRequester, options?: {
    identifier: 'path' | 'methodName'
}): Promise<StorexHubApi_v0> {
    const usePath = options?.identifier !== 'methodName'

    const api: StorexHubApi_v0 = {} as any
    for (const method of Object.entries(STOREX_HUB_API_v0)) {
        api[method[0]] = ((method: [string, MethodDescription]) => async (methodOptions: any) => {
            const response = await request(usePath ? method[1].path : method[0], {
                methodOptions
            })
            return response.result
        })(method)
    }
    return api
}

export async function createStorexHubSocketClient(socket: SocketIOClient.Socket, options?: { callbacks?: Partial<StorexHubCallbacks_v0> }) {
    const waitForConnection = new Promise((resolve, reject) => {
        socket.once('connect', () => {
            resolve()
        })
    })
    const waitForError = new Promise<never>((resolve, reject) => {
        socket.once('error', (error: Error) => {
            reject(error)
        })
    })
    if (options?.callbacks) {
        const callbacks = options.callbacks
        socket.on('request', async (message: any) => {
            const response = await callbacks[message.methodName](message.methodOptions)
            socket.emit('response', {
                requestId: message.requestId,
                response
            })
        })
    }

    await Promise.race([waitForConnection, waitForError])

    let requestCount = 0
    return createStorexHubClient(
        async (methodName, options) => {
            const requestId = ++requestCount

            const waitForResponse = new Promise<{ result: any }>((resolve, reject) => {
                const handler = (response: any) => {
                    if (response.requestId === requestId) {
                        socket.removeListener('response', handler)
                        resolve({ result: response.result })
                    }
                }
                socket.addEventListener('response', handler)
            })
            socket.emit('request', {
                requestId,
                methodName,
                methodOptions: options.methodOptions,
            })
            const response = await Promise.race([waitForResponse, waitForError])

            return {
                result: response.result,
            }
        },
        { identifier: 'methodName' }
    )
}
