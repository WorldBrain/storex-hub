import { CollectionDefinition } from "@worldbrain/storex/lib/types";

export const TEST_COLLECTION_DEFINITIONS = {
    simpleUser: (options: { fields: Set<'email' | 'displayName'> }): CollectionDefinition => ({
        version: new Date(),
        fields: {
            ...(options.fields.has('email') ? { email: { type: 'string' } } : {}),
            ...(options.fields.has('displayName') ? { displayName: { type: 'string' } } : {}),
        }
    })
}