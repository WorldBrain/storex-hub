import { StorageModule, StorageModuleConfig } from '@worldbrain/storex-pattern-modules'
import { AppSchema } from '@worldbrain/storex-hub-interfaces/lib/apps';
import { AppSettingValue } from '@worldbrain/storex-hub-interfaces/lib/api/server';
import STORAGE_VERSIONS from '../versions';
import { extendedJSONReviver } from '../../utils/json';
import { SettingsDescription } from '@worldbrain/storex-hub-interfaces/lib/settings';

export class AppStorage extends StorageModule {
    getConfig(): StorageModuleConfig {
        return {
            collections: {
                app: {
                    version: STORAGE_VERSIONS[0],
                    fields: {
                        identifier: { type: 'string' },
                        accessKeyHash: { type: 'string' },
                        isRemote: { type: 'boolean', optional: true }
                    }
                },
                appSchema: {
                    version: STORAGE_VERSIONS[0],
                    fields: {
                        schema: { type: 'string' },
                    },
                    relationships: [
                        { singleChildOf: 'app' }
                    ]
                },
                appSettingsDescription: {
                    version: STORAGE_VERSIONS[1],
                    fields: {
                        description: { type: 'json' },
                    },
                    relationships: [
                        { childOf: 'app' }
                    ],
                },
                appSettingsObject: {
                    version: STORAGE_VERSIONS[1],
                    fields: {
                        settings: { type: 'json' },
                    },
                    relationships: [
                        { childOf: 'app' }
                    ],
                }
            },
            operations: {
                createApp: {
                    operation: 'createObject',
                    collection: 'app'
                },
                findAppByIdentifier: {
                    operation: 'findObject',
                    collection: 'app',
                    args: { identifier: '$identifier:string' }
                },
                createSchema: {
                    operation: 'createObject',
                    collection: 'appSchema'
                },
                updateSchema: {
                    operation: 'updateObject',
                    collection: 'appSchema',
                    args: [
                        { app: '$app:pk' },
                        { schema: '$schema:string' }
                    ]
                },
                getSchema: {
                    operation: 'findObject',
                    collection: 'appSchema',
                    args: { app: '$app:pk' }
                },
                getAllSchemas: {
                    operation: 'findObjects',
                    collection: 'appSchema',
                    args: {}
                },
                createSettingsDescription: {
                    operation: 'createObject',
                    collection: 'appSettingsDescription',
                },
                findSettingsDescription: {
                    operation: 'findObject',
                    collection: 'appSettingsDescription',
                    args: { app: '$appId:pk' },
                },
                updateSettingsDescription: {
                    operation: 'updateObjects',
                    collection: 'appSettingsDescription',
                    args: [
                        { app: '$appId:pk' },
                        { description: '$description:json' }
                    ],
                },
                createSettings: {
                    operation: 'createObject',
                    collection: 'appSettingsObject',
                },
                findSettings: {
                    operation: 'findObject',
                    collection: 'appSettingsObject',
                    args: { app: '$appId:pk' },
                },
                updateSettings: {
                    operation: 'updateObjects',
                    collection: 'appSettingsObject',
                    args: [
                        { app: '$appId:pk' },
                        { settings: '$settings:json' }
                    ],
                }
            }
        }
    }

    async createApp(app: { identifier: string, accessKeyHash: string, isRemote?: boolean }) {
        await this.operation('createApp', app)
    }

    async getApp(identifier: string) {
        return this.operation('findAppByIdentifier', { identifier })
    }

    async updateSchema(appId: string | number, schema: AppSchema) {
        const existingSchema = await this.operation('getSchema', { app: appId })
        const serialized = JSON.stringify(schema, null, 4)
        if (existingSchema) {
            await this.operation('updateSchema', { app: appId, schema: serialized })
        } else {
            await this.operation('createSchema', { app: appId, schema: serialized })
        }
    }

    async getAppSchemas(): Promise<Array<{ schema: AppSchema }>> {
        const jsonReviver = extendedJSONReviver({ withDates: true })

        const schemaObjects = await this.operation('getAllSchemas', {});
        return schemaObjects.map((schemaObject: { schema: string }) => ({
            schema: JSON.parse(schemaObject.schema, jsonReviver)
        }))
    }

    async getAppSchema(appId: number): Promise<{ schema: AppSchema } | null> {
        const jsonReviver = extendedJSONReviver({ withDates: true })

        const schemaObject = await this.operation('getSchema', { app: appId });
        if (!schemaObject?.schema) {
            return null
        }

        return { schema: JSON.parse(schemaObject.schema, jsonReviver) }
    }

    async getAppSettingsDescription(appId: number) {
        const object = await this.operation('findSettingsDescription', { appId })
        return object ? object.description : null
    }

    async setAppSettingsDescription(appId: number, description: SettingsDescription) {
        const object = await this.operation('findSettingsDescription', { appId })
        if (object) {
            await this.operation('updateSettingsDescription', { appId, description })
        } else {
            await this.operation('createSettingsDescription', { app: appId, description })
        }
    }

    async getAppSettings(appId: number) {
        const object = await this.operation('findSettings', { appId })
        return object ? object.settings : null
    }

    async setAppSettings(appId: number, settings: { [key: string]: AppSettingValue }) {
        const object = await this.operation('findSettings', { appId })
        if (object) {
            await this.operation('updateSettings', { appId, settings })
        } else {
            await this.operation('createSettings', { app: appId, settings })
        }
    }
}
