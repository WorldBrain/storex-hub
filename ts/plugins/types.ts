import { PluginInfo } from '@worldbrain/storex-hub-interfaces/ts/plugins'

export interface InstalledPluginMetadata {
    identifier: string
    addedWhen: number
    enabled: boolean
    path: string
    info: PluginInfo
}
