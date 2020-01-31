import Koa from 'koa'
import Router from 'koa-router'
import session from 'koa-session'
import bodyParser from 'koa-bodyparser'
import { Application } from "./application";
import { STOREX_HUB_API_v0, StorexClientAPI_v0 } from './public-api';

export async function createServer(application: Application, options: {
    secretKey: string
}): Promise<{ start: () => Promise<void>, app: Koa }> {
    const router = new Router()
    const app = new Koa()
    app.keys = [options.secretKey]
    app.use(bodyParser())
    app.use(session({

    }, app))

    // TODO: This will leak a lot, since sessions never get cleaned up
    const sessions: { [appName: string]: StorexClientAPI_v0 } = {}

    for (const [methodName, methodDescription] of Object.entries(STOREX_HUB_API_v0)) {
        router.post(methodDescription.path, async ctx => {
            const identifiedAppName = ctx['session'].appName
            const api = identifiedAppName ? sessions[identifiedAppName] : await application.api()
            if (!api) {
                throw new Error('TODO: do something useful here')
            }

            const methodOptions = ctx.request['body']
            const result = await api[methodName](methodOptions)
            if (!identifiedAppName) {
                const sessionInfo = await api.getSessionInfo()
                if (sessionInfo.appIdentifier) {
                    sessions[sessionInfo.appIdentifier] = api
                    ctx['session'].appName = sessionInfo.appIdentifier
                }
            }

            ctx.body = result
        })
    }
    app.use(router.routes())

    return {
        app,
        start: async () => {
            app.listen(parseInt(process.env.PORT || '3000'))
        }
    }
}
