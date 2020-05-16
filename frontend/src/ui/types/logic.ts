import { UILogic, UIEvent, UIMutation } from 'ui-logic-core';
import { UIElement } from 'ui-logic-react'

export const StatefulUIComponent = UIElement
export const StatefulUILogic = UILogic
export type StatefulUIEvent<Events> = UIEvent<Events>
export type UIEventsFromHandlers<Handlers> = {
    [EventName in keyof Handlers]:
    Handlers[EventName] extends (event: infer EventType) => void
    ? EventType : never
}
export type LogicHandlersFromUIEvents<Logic extends UILogic<any, any>> = {
    [EventName in keyof LogicEvents<Logic>]: (event: LogicEvents<Logic>[EventName]) => LogicHandlerReturnValue<Logic>
}
export type LogicHandlerReturnValue<Logic extends UILogic<any, any>> =
    void | Promise<void> |
    UIMutation<LogicState<Logic>> | UIMutation<LogicState<Logic>>
export type LogicState<Logic> = Logic extends UILogic<infer State, any> ? State : never
export type LogicEvents<Logic> = Logic extends UILogic<any, infer Event> ? Event : never
