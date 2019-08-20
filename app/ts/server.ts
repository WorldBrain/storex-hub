import { Application } from "./application";

export function createServer(application : Application, options : {

}) : { start : () => Promise<void> } {
    return { start: async () => {
        // const server = new ApolloServer({ schema })
        // const { url } = await server.listen()
        // options.reporter('Server is running on %s', {url})
    } }
}
