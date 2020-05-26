import path from 'path'
const { open } = require('openurl')
const tcpPortUsed = require('tcp-port-used')
import { mkdirSync } from 'fs-extra';
import { main, getPortNumber } from "./main";

const AutoLaunch = require('auto-launch');

export async function standalone() {
    if (process.env.NO_PRODUCTION !== 'true') {
        process.env.NODE_ENV = 'production'
    }

    const autoLauncher = new AutoLaunch({
        name: 'Storex Hub',
        path: process.argv[0],
    })

    const portNumber = getPortNumber()
    const alreadyRunning = await tcpPortUsed.check(portNumber)
    const isFirstRun = !await autoLauncher.isEnabled()
    const openManagementUI = () => {
        if (process.env.NO_BROWSER !== 'true') {
            open(`http://localhost:${portNumber}/management`)
        }
    }

    if (alreadyRunning) {
        await openManagementUI()
        process.exit(0)
    }

    if (process.env.NO_AUTO_LAUNCH !== 'true') {
        autoLauncher.enable()
    }

    const standaloneDirPath = path.dirname(process.argv[0])
    const frontendDir = process.env.DB_PATH || path.join(standaloneDirPath, 'frontend')
    const dbFilePath = process.env.DB_PATH || path.join(standaloneDirPath, 'database')
    const pluginsDir = process.env.PLUGINS_DIR || path.join(standaloneDirPath, 'plugins')
    try {
        mkdirSync(pluginsDir)
    } catch (e) { }

    await main({
        runtimeConfig: { dbPath: dbFilePath, pluginsDir },
        frontendDir
    })

    if (isFirstRun) {
        openManagementUI()
    }
}

if (require.main === module) {
    standalone()
}
