import { StorageModule, StorageModuleConfig } from '@worldbrain/storex-pattern-modules'
import STORAGE_VERSIONS from '../versions';
import { CollectionDefinitionMap } from '@worldbrain/storex';
import { AppSchema } from '../../types/apps';
import { extendedJSONReviver } from '../../utils/json';

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
            }
        }
    }

    async createApp(app: { identifier: string, accessKeyHash: string, isRemote?: boolean }) {
        await this.operation('createApp', app)
    }

    async getApp(identifier: string) {
        return this.operation('findAppByIdentifier', { identifier })
    }

    async updateSchema(app: string | number, schema: AppSchema) {
        const existingSchema = await this.operation('getSchema', { app })
        const serialized = JSON.stringify(schema, null, 4)
        if (existingSchema) {
            await this.operation('updateSchema', { app, schema: serialized })
        } else {
            await this.operation('createSchema', { app, schema: serialized })
        }
    }

    async getAppSchemas(): Promise<Array<{ schema: AppSchema }>> {
        const jsonReviver = extendedJSONReviver({ withDates: true })

        return (await this.operation('getAllSchemas', {})).map((schemaObject: { schema: string }) => ({
            schema: JSON.parse(schemaObject.schema, jsonReviver)
        }))
    }
}
