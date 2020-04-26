import path from 'path'
import { main } from "./main";

const AutoLaunch = require('auto-launch');

export async function standalone() {
    if (process.env.NO_AUTO_LAUNCH !== 'true') {
        const autoLauncher = new AutoLaunch({
            name: 'Storex Hub',
            path: process.argv[0],
        })
        autoLauncher.enable()
    }

    const dbFilePath = path.join(path.dirname(process.argv[0]), 'database')

    await main({ runtimeConfig: { dbFilePath } })
}

if (require.main === module) {
    standalone()
}
