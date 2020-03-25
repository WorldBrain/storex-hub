export type SingleArgumentOf<T> = T extends (arg: infer U) => any ? U : never
export type UnwrapPromise<Promised extends Promise<any>> = Promised extends Promise<infer U> ? U : never
