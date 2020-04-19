import * as path from 'path'
import { existsSync, readFileSync } from 'fs'
import { InspectPluginError_v0 } from '@worldbrain/storex-hub-interfaces/lib/api'
import { PluginInfo } from '@worldbrain/storex-hub-interfaces/lib/plugins'

export async function getPluginInfo(location: string): Promise<InspectPluginError_v0 | { status: 'success', pluginInfo: PluginInfo }> {
    const manifestPath = path.join(location, 'manifest.json')
    if (!existsSync(manifestPath)) {
        return { status: 'not-found', location }
    }

    let manifestContent: string
    try {
        manifestContent = readFileSync(manifestPath).toString()
    } catch (e) {
        console.error(e)
        return { status: 'could-not-read', location }
    }

    let parsedManifest
    try {
        parsedManifest = JSON.parse(manifestContent)
    } catch (e) {
        return { status: 'invalid-json' }
    }

    const pluginInfo = validatePluginInfo(parsedManifest)
    if (!pluginInfo) {
        return { status: 'validation-failed' }
    }
    return { status: 'success', pluginInfo }
}

function validatePluginInfo(untrusted: any): PluginInfo | null {
    return untrusted
}