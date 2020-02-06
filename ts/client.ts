import { StorexHubApi_v0, STOREX_HUB_API_v0, StorexHubCallbacks_v0 } from "./public-api";

export type StorexHubClientRequester<Result = any> = (url: string, options: {
    methodOptions: any
}) => Promise<{ result: Result }>

export async function createStorexHubClient(request: StorexHubClientRequester, options?: {
    identifier: 'path' | 'methodName'
}): Promise<StorexHubApi_v0> {
    const usePath = options?.identifier !== 'methodName'

    const api: StorexHubApi_v0 = {} as any
    for (const [methodName, methodDescription] of Object.entries(STOREX_HUB_API_v0)) {
        api[methodName] = async (methodOptions: any) => {
            const response = await request(usePath ? methodDescription.path : methodName, {
                methodOptions
            })
            return response.result
        }
    }
    return api
}

export async function createStorexHubSocketClient(socket: SocketIOClient.Socket, options?: { callbacks?: StorexHubCallbacks_v0 }) {
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

    return createStorexHubClient(
        async (methodName, options) => {
            const waitForResponse = new Promise<{ result: any }>((resolve, reject) => {
                socket.once('response', (response: any) => {
                    resolve(response)
                })
            })
            socket.emit('request', {
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
