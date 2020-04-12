import * as path from 'path'
import { StorageModule, StorageModuleConfig } from "@worldbrain/storex-pattern-modules";
import STORAGE_VERSIONS from "../../storage/versions";
import { PluginInfo } from '@worldbrain/storex-hub-interfaces/lib/plugins';

export class PluginManagementStorage extends StorageModule {
    getConfig = (): StorageModuleConfig => ({
        collections: {
            pluginInfo: {
                version: STORAGE_VERSIONS[0],
                fields: {
                    identifier: { type: 'string' },
                    addedWhen: { type: 'timestamp' },
                    enabled: { type: 'boolean' },
                    path: { type: 'string' },
                    info: { type: 'json' }
                }
            },
        },
        operations: {
            addPlugin: {
                operation: 'createObject',
                collection: 'pluginInfo',
            },
            getEnabledPlugins: {
                operation: 'findObjects',
                collection: 'pluginInfo',
                args: { enabled: true },
            },
            findPluginByIdentifier: {
                operation: 'findObject',
                collection: 'pluginInfo',
                args: { identifier: '$identifier' }
            }
        }
    })

    async addPlugin(info: PluginInfo, extraInfo: { path: string }) {
        this.operation('addPlugin', {
            info,
            identifier: info.identifier,
            path: extraInfo.path,
            addedWhen: this._getNow(),
            enabled: true
        })
    }

    async getPluginInfoByIdentifier(identifier: string) {
        return ((await this.operation('findPluginByIdentifier', { identifier })) || null)?.info
    }

    async getInfoForEnabledPlugins(): Promise<PluginInfo[]> {
        const records: any[] = (await this.operation('getEnabledPlugins', {}))
        return records.map(record => ({
            ...record.info,
            mainPath: path.join(record.path, record.info.mainPath)
        }))
    }

    _getNow = () => Date.now()
}
