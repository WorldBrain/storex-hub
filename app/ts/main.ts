import { createServer } from "./server";
import { Application } from "./application";

export async function main() {
    const application = new Application({dbPath: 'sqlite://'})
    await application.setup()
    const server = createServer(application, {
    })
    await server.start()
}

if(require.main === module) {
    main()
}
