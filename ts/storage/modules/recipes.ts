import { StorageModule, StorageModuleConfig } from '@worldbrain/storex-pattern-modules'
import STORAGE_VERSIONS from '../versions';
import { extendedJSONReviver } from '../../utils/json';
import { RecipeDefinition } from '@worldbrain/storex-hub-interfaces/lib/recipes';

export class RecipeStorage extends StorageModule {
    getConfig(): StorageModuleConfig {
        return {
            collections: {
                integrationRecipe: {
                    version: STORAGE_VERSIONS[2],
                    fields: {
                        content: { type: 'json' },
                    }
                }
            },
            operations: {
                createRecipe: {
                    operation: 'createObject',
                    collection: 'integrationRecipe'
                },
                getAllRecipes: {
                    operation: 'findObjects',
                    collection: 'integrationRecipe',
                    args: {}
                },
                deleteRecipeById: {
                    operation: 'deleteObjects',
                    collection: 'integrationRecipe',
                    args: { id: '$id:pk' }
                }
            }
        }
    }

    async createRecipe(content: RecipeDefinition) {
        await this.operation('createRecipe', { content })
    }

    async getAllRecipes(): Promise<RecipeDefinition[]> {
        return this.operation('getAllRecipes', {})
    }
}
