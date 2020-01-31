import { createServer } from "./server";
import { Application } from "./application";

export async function main() {
    const application = new Application({})
    await application.setup()
    const server = await createServer(application)
    await server.start()
}

if (require.main === module) {
    main()
}
