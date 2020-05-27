import { SingleArgumentOf, UnwrapPromise } from "./types/utils"
import { StorexHubCallbacks_v0, AllStorexHubCallbacks_v0 } from "./public-api"
import { IdentifiedApp } from "./types"

export type ExecuteCallbackResult<MethodName extends keyof AllStorexHubCallbacks_v0> = {
    status: 'success'
    result: UnwrapPromise<ReturnType<AllStorexHubCallbacks_v0[MethodName]>>
} | {
    status: 'app-not-found'
}

export class RemoteSessions {
    private remoteSessions: { [identifier: string]: AllStorexHubCallbacks_v0 } = {}

    initializeApp(app: Pick<IdentifiedApp, 'identifier'>, callbacks: AllStorexHubCallbacks_v0) {
        this.remoteSessions[app.identifier] = callbacks
    }

    cleanupApp(app: Pick<IdentifiedApp, 'identifier'>) {
        delete this.remoteSessions[app.identifier]
    }

    getRemoteSession = (appIdentifier: string): StorexHubCallbacks_v0 | null => {
        return this.remoteSessions[appIdentifier]
    }

    executeCallback = async <MethodName extends keyof AllStorexHubCallbacks_v0>(
        appIdentifier: string,
        methodName: MethodName,
        methodOptions: SingleArgumentOf<AllStorexHubCallbacks_v0[MethodName]>
    ): Promise<ExecuteCallbackResult<MethodName>> => {
        const remoteSession = this.remoteSessions[appIdentifier]
        if (!remoteSession) {
            return { status: 'app-not-found' }
        }

        const method = remoteSession[methodName] as AllStorexHubCallbacks_v0[MethodName]
        const result = await method(methodOptions as any) as any
        return { status: 'success', result }
    }
}