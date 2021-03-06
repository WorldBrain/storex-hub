import { UserLogic } from 'user-logic'
import { StorageOperationChangeInfo } from "@worldbrain/storex-middleware-change-watcher/lib/types";
import { RecipeDefinition, RecipeAction } from "@worldbrain/storex-hub-interfaces/lib/recipes";
import { CreateRecipeResult_v0 } from "./public-api";
import { RecipeStorage } from "./storage/modules/recipes";
import { AppEvents } from "./app-events";
import { RemoteSessions } from "./remote-sessions";
import { matchObject } from './utils/match-object';

export class RecipeManager {
    constructor(private options: {
        getRecipeStorage: () => Promise<RecipeStorage>
        appEvents: AppEvents
        remoteSessions: RemoteSessions
    }) {

    }

    async setup() {
        const recipeStorage = await this.options.getRecipeStorage()
        const recipes = await recipeStorage.getAllRecipes()
        for (const recipe of recipes) {
            try {
                await this.setupRecipe(recipe)
            } catch (e) {
                console.error('Error during recipe setup:')
                console.error(e)
            }
        }
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
            const subscribe = () => this.options.appEvents.subscribeToEvent({
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

            subscribe()
            this.options.appEvents.subscribeToEvent({ request: { type: 'app-availability-changed' } }, async ({ event }) => {
                if (event.type !== 'app-availability-changed') {
                    return
                }
                if (event.app !== select.app) {
                    return
                }
                if (event.availability) {
                    subscribe()
                }
            })
        } else {
            throw new Error(`Non-remote selects in recipes are not supported yet.`)
        }
    }

    async _processStorageChange(recipe: RecipeDefinition, info: StorageOperationChangeInfo<'post'>) {
        const { select } = recipe
        for (const change of info.changes) {
            if (change.type === 'create') {
                const matchTarget = { ...change.values }
                if (select.pk) {
                    if (typeof select.pk !== 'string') {
                        for (const [index, name] of select.pk.entries()) {
                            matchTarget[name] = change.pk[index]
                        }
                    } else {
                        matchTarget[select.pk] = change.pk
                    }
                }

                const { matches } = matchObject({ object: matchTarget, filter: recipe.select.where });
                if (!matches) {
                    continue
                }

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
                console.log('Recipe executing remote call:', args)
                await this.options.remoteSessions.executeCallback(action.app, 'handleRemoteCall', args)
            } else if ('operation' in action) {
                if (!action.remote) {
                    throw new Error(`Non-remote operations in recipes are not supported yet.`)
                }
                if (!['findObject', 'findObjects'].includes(action.operation)) {
                    throw new Error(`Unsupported operation found in recipe: ${action.operation}`)
                }

                let result = await this.options.remoteSessions.executeCallback(action.app, 'handleRemoteOperation', {
                    operation: [action.operation, action.collection, action.where],
                    sourceApp: '',
                })
                if (('status' in result) && result.status !== 'success') {
                    throw new Error(`Error status received while trying to execute remote operation: ${result.status}`)
                }
                const callbackResult = result.result
                if (('status' in callbackResult) && callbackResult.status !== 'success') {
                    throw new Error(`Error status received while trying to execute remote operation: ${callbackResult.status}`)
                }
                if (action.placeholder) {
                    context[action.placeholder] = callbackResult.result
                }
            }
        }
    }
}