import isPlainObject from 'lodash/isPlainObject'

export function matchObject(options: { object: { [key: string]: any }, filter: { [key: string]: any } }): { matches: boolean } {
    let matches = true
    for (let [filterKey, filterValue] of Object.entries(options.filter)) {
        if (!isPlainObject(filterValue)) {
            filterValue = { $eq: filterValue }
        }
        for (const [operator, operatorValue] of Object.entries(filterValue)) {
            if (operator === '$gt') {
                matches = matches && options.object[filterKey] > (operatorValue as number)
            } else if (operator === '$eq') {
                matches = matches && options.object[filterKey] === operatorValue
            }
        }

    }
    return { matches }
}
