import { UserLogic } from 'user-logic'
import { StorageOperationChangeInfo } from "@worldbrain/storex-middleware-change-watcher/lib/types";
import { RecipeDefinition, RecipeAction } from "@worldbrain/storex-hub-interfaces/lib/recipes";
import { CreateRecipeResult_v0 } from "./public-api";
import { RecipeStorage } from "./storage/modules/recipes";
import { AppEvents } from "./app-events";
import { RemoteSessions } from "./remote-sessions";

export class RecipeManager {
    constructor(private options: {
        getRecipeStorage: () => Promise<RecipeStorage>
        appEvents: AppEvents
        remoteSessions: RemoteSessions
    }) {

    }

    async createRecipe(recipe: RecipeDefinition): Promise<CreateRecipeResult_v0> {
        const recipeStorage = await this.options.getRecipeStorage()
        await recipeStorage.createRecipe(recipe)
        await this.setupRecipe(recipe)
        return { status: 'success' }
    }

    async setupRecipe(recipe: RecipeDefinition) {
        const { select } = recipe
        if (select.remote) {
            this.options.appEvents.subscribeToEvent({
                request: {
                    type: 'storage-change',
                    app: select.app,
                    collections: [select.collection],
                }
            }, async (options) => {
                const { event } = options
                if (event.type !== 'storage-change') {
                    return
                }
                this._processStorageChange(recipe, event.info)
            })
        }
    }

    async _processStorageChange(recipe: RecipeDefinition, info: StorageOperationChangeInfo<'post'>) {
        const { select } = recipe
        for (const change of info.changes) {
            if (change.type === 'create') {
                await this._processObject(recipe, 'add', { [select.placeholder]: { pk: change.pk, values: change.values } })
            } else if (change.type === 'modify') {
                for (const pk of change.pks) {
                    await this._processObject(recipe, 'modify', { [select.placeholder]: { pk, updates: change.updates } })
                }
            } else if (change.type === 'delete') {
                for (const pk of change.pks) {
                    await this._processObject(recipe, 'remove', { [select.placeholder]: { pk } })
                }
            }
        }
    }

    async _processObject(recipe: RecipeDefinition, event: keyof RecipeDefinition['on'], context: { [key: string]: any }) {
        context = { ...context }
        for (const actionDefinition of recipe.on[event] ?? []) {
            const logic = new UserLogic({ definition: { literal: actionDefinition } })
            const action: RecipeAction = logic.evaluate(context)
            if ('call' in action) {
                const args = { ...action }
                delete args.app
                await this.options.remoteSessions.executeCallback(action.app, 'handleRemoteCall', args)
            }
        }
    }
}