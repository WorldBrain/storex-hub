import Koa from 'koa'
import Router from 'koa-router'
import session from 'koa-session'
import bodyParser from 'koa-bodyparser'
const IO = require('koa-socket-2')
import { Application } from "../application";
import { STOREX_HUB_API_v0, StorexHubApi_v0 } from '../public-api';
import { Server } from 'http'
import { SocketSessionMap } from './socket-session-map'

export async function createHttpServer(application: Application, options: {
    secretKey: string
}) {
    const router = new Router()
    const app = new Koa()
    app.keys = [options.secretKey]
    app.use(bodyParser())
    app.use(session({
    }, app))

    const io = new IO() as SocketIO.Server
    io.attach(app)
    setupWebsocketServer(io, application)

    // TODO: This will leak a lot, since sessions never get cleaned up
    const sessions: { [appName: string]: StorexHubApi_v0 } = {}

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

    let server: Server
    return {
        app,
        start: async (options?: { port?: number }) => {
            server = app.listen(options?.port ?? parseInt(process.env.PORT || '3000'))
        },
        stop: async () => {
            if (server) {
                server.close()
            }
        }
    }
}

function setupWebsocketServer(io: SocketIO.Server, application: Application) {
    const sessions = new SocketSessionMap({ createSession: () => application.api() })
    sessions.setup(io)

    io.on('request', async (message: { socket: SocketIO.Socket, event: string, data: { methodName: string, methodOptions: any } }) => {
        const api = await sessions.getSession(message.socket)
        const result = await api[message.data.methodName](message.data.methodOptions)
        message.socket.emit('response', { result })
    })
    return io
}
