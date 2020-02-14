export interface OperationIntropection {
    effects: OperationEffect[]
}

export interface OperationEffect {
    collection: string
    reads: boolean
    writes: boolean
}

export type OperationAnalyzer = (operation: any[]) => OperationIntropection
