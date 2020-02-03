import { createHttpServer } from "./server";
import { Application } from "./application";

export async function main() {
    const application = new Application({})
    await application.setup()
    const server = await createHttpServer(application)
    await server.start()
}

if (require.main === module) {
    main()
}
