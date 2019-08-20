import { CollectionDefinitionMap } from "@worldbrain/storex";

export interface AppSchema {
    collectionDefinitions? : CollectionDefinitionMap
    collectionDescriptions? : any
    virtualTables? : any
    terms? : any
}