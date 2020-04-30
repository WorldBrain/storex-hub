import path from 'path'
import { main } from "./main";
import { mkdirSync } from 'fs-extra';

const AutoLaunch = require('auto-launch');

export async function standalone() {
    if (process.env.NO_AUTO_LAUNCH !== 'true') {
        const autoLauncher = new AutoLaunch({
            name: 'Storex Hub',
            path: process.argv[0],
        })
        autoLauncher.enable()
    }

    const standaloneDirPath = path.dirname(process.argv[0])
    const dbFilePath = path.join(standaloneDirPath, 'database')
    const pluginsDir = path.join(standaloneDirPath, 'plugins')
    try {
        mkdirSync(pluginsDir)
    } catch (e) { }

    await main({ runtimeConfig: { dbPath: dbFilePath, pluginsDir } })
}

if (require.main === module) {
    standalone()
}
