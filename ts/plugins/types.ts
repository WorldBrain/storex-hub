import { StorexHubApi_v0 } from "../public-api";

export interface PluginInfo {
    identifier: string
    version: string
    description: string
    apps: Array<{ name: string, description?: string }>
    siteUrl: string
    mainPath: string
    entryFunction: string
}

export interface PluginInterface {
    start(): Promise<void>
    stop(): Promise<void>
}

export type PluginEntryFunction = (input: { api: StorexHubApi_v0 }) => Promise<PluginInterface>
