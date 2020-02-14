import { OperationIntropection, OperationAnalyzer } from "./types"

export function introspectOperation(operation: any[], options: {
    analyzers: { [operation: string]: OperationAnalyzer }
}): OperationIntropection | null {
    const analyzer = options.analyzers[operation[0]]
    if (!analyzer) {
        return null
    }

    return analyzer(operation)
}
