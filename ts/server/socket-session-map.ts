export class SocketSessionMap<Session> {
    public sessions: { [id: string]: Promise<Session> } = {}

    constructor(private options: { createSession: () => Promise<Session> }) {
    }

    setup(io: SocketIO.Server) {
        io.on('connection', async (client) => {
            const id = client.id

            if (!this.sessions[id]) {
                this.sessions[id] = this.options.createSession()

                client.once('disconnect', () => {
                    if (this.sessions[id]) {
                        delete this.sessions[id]
                    }
                })
            }
        })
    }

    async getSession(socket: SocketIO.Socket) {
        const promise = this.sessions[socket.id]
        return promise ?? null
    }
}
