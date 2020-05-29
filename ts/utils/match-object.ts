import isPlainObject from 'lodash/isPlainObject'

const OPERATORS: { [operatorName: string]: (left: any, right: any) => boolean } = {
    $eq: (left: any, right: any) => left === right,
    $gt: (left: any, right: any) => left > right,
    $ge: (left: any, right: any) => left >= right,
    $lt: (left: any, right: any) => left < right,
    $le: (left: any, right: any) => left <= right,
    $in: (left: any, right: any) => right.includes(left),
}

export function matchObject(options: { object: { [key: string]: any }, filter: { [key: string]: any } }): { matches: boolean } {
    let matches = true
    for (let [filterKey, filterValue] of Object.entries(options.filter)) {
        if (!isPlainObject(filterValue)) {
            filterValue = { $eq: filterValue }
        }
        for (const [operatorName, operatorValue] of Object.entries(filterValue)) {
            const operator = OPERATORS[operatorName]
            matches = matches && operator(options.object[filterKey], operatorValue)
        }

    }
    return { matches }
}
