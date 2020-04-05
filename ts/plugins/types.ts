export interface PluginInfo {
    identifier: string
    version: string
    description: string
    apps: Array<{ name: string, description?: string }>
    siteUrl: string
    mainPath: string
    entryFunction: string
}
