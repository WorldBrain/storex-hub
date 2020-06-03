import isPlainObject from 'lodash/isPlainObject'
import every from 'lodash/every'
import isString from 'lodash/isString'
import isNumber from 'lodash/isNumber'

interface Operator {
    execute: (left: any, right: any) => boolean
    validate: (right: any) => { valid: true } | { valid: false, message: string }
}
function conditions(predicates: Array<(right: any) => true | string>): Operator['validate'] {
    return (right: any) => {
        for (const item of predicates) {
            const result = item(right)
            if (typeof result === 'string') {
                return { valid: false, message: result }
            }
        }

        return { valid: true }
    }
}
function condition(predicate: (right: any) => true | string): Operator['validate'] {
    return conditions([predicate])
}
function numberCondition() {
    return condition(right => typeof right === 'number' || 'should compare with a number')
}

const OPERATORS: { [operatorName: string]: Operator } = {
    $eq: {
        execute: (left: any, right: any) => left === right,
        validate: right => ({ valid: true })
    },
    $gt: {
        execute: (left: any, right: any) => left > right,
        validate: numberCondition()
    },
    $ge: {
        execute: (left: any, right: any) => left >= right,
        validate: numberCondition()
    },
    $lt: {
        execute: (left: any, right: any) => left < right,
        validate: numberCondition()
    },
    $le: {
        execute: (left: any, right: any) => left <= right,
        validate: numberCondition()
    },
    $in: {
        execute: (left: any, right: any) => right.includes(left),
        validate: conditions([
            right => (right instanceof Array) || '$in operator found without array',
            right => every(right, value => isString(value) || isNumber(value)) || '$in operator must only have string and number values'
        ])
    },
}

export function matchObject(options: { object: { [key: string]: any }, filter: { [key: string]: any } }): { matches: boolean } {
    let matches = true
    for (const [filterKey, filterValue] of cleanedFilter(options.filter)) {
        for (const [operatorName, operatorValue] of Object.entries(filterValue)) {
            const operator = OPERATORS[operatorName]
            matches = matches && operator.execute(options.object[filterKey], operatorValue)
        }

    }
    return { matches }
}

export function validateObjectFilter(filter: { [key: string]: any }): { valid: true } | { valid: false, field?: string, operator?: string, message: string } {
    for (const [filterKey, filterValue] of cleanedFilter(filter)) {
        if (filterKey.startsWith('$')) {
            return { valid: false, message: `found field name starting with $: ${filterKey}` }
        }

        for (const [operatorName, operatorValue] of Object.entries(filterValue)) {
            const operator = OPERATORS[operatorName]
            if (!operator) {
                return { valid: false, message: `found invalid operator for field '${filterKey}': ${operatorName}` }
            }

            const operatorValidation = operator.validate(operatorValue)
            if (!operatorValidation.valid) {
                return { valid: false, field: filterKey, operator: operatorName, message: operatorValidation.message }
            }
        }
    }
    return { valid: true }
}

function* cleanedFilter(filter: { [key: string]: any }) {
    for (let [filterKey, filterValue] of Object.entries(filter)) {
        if (!isPlainObject(filterValue)) {
            filterValue = { $eq: filterValue }
        }

        yield [filterKey, filterValue]
    }
}