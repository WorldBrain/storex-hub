import { StorexHubApi_v0, STOREX_HUB_API_v0 } from "./public-api";

export type StorexHubClientRequester<Result = any> = (url: string, options: {
    methodOptions: any
}) => Promise<{ result: Result }>

export async function createStorexHubHttpClient(request: StorexHubClientRequester): Promise<StorexHubApi_v0> {
    const api: StorexHubApi_v0 = {} as any
    for (const [methodName, methodDescription] of Object.entries(STOREX_HUB_API_v0)) {
        api[methodName] = async (methodOptions: any) => {
            const response = await request(methodDescription.path, {
                methodOptions
            })
            return response.result
        }
    }
    return api
}