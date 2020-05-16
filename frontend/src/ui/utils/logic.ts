import { UILogic } from "ui-logic-core"
import { UIElement } from "ui-logic-react"

export type UITaskState = 'pristine' | 'running' | 'success' | 'error'

export async function loadInitial<State extends { loadState: UITaskState }>(logic: UILogic<State, any>, loader: () => Promise<any>): Promise<boolean> {
    return (await executeUITask(logic, 'loadState', loader))[0]
}

export async function executeUITask<
    State,
    Key extends keyof State,
    ReturnValue
>(logic: UILogic<State, any>, key: Key, loader: () => Promise<ReturnValue>): Promise<[false] | [true, ReturnValue]> {
    logic.emitMutation({ [key]: { $set: 'running' } } as any)

    try {
        const returned = await loader()
        logic.emitMutation({ [key]: { $set: 'success' } } as any)
        return [true, returned]
    } catch (e) {
        console.error(e)
        logic.emitMutation({ [key]: { $set: 'error' } } as any)
        return [false]
    }
}

export function logicHandlers<Element extends UIElement<any, any>>(element: Element): any {
    return new Proxy({}, {
        get: (_, eventName) => {
            return async (event: any) => {
                element.processEvent(eventName as any, event)
            }
        }
    }) as any
}
