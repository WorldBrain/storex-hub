import expect from "expect"
import { matchObject, validateObjectFilter } from "./match-object"

describe('Match object', () => {
    function testMatch(options: { object: { [key: string]: any }, filter: { [key: string]: any }, matches: boolean }) {
        expect(matchObject(options)).toEqual({ matches: options.matches })
    }

    function testValidation(options: { filter: { [key: string]: any }, result: ReturnType<typeof validateObjectFilter> }) {
        expect(validateObjectFilter(options.filter)).toEqual(options.result)
    }

    describe('equality clauses', () => {
        it('should match exact matches', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: 5 },
                matches: true
            })
        })

        it('should match subsets', () => {
            testMatch({
                object: { foo: 5, bar: 7 },
                filter: { foo: 5 },
                matches: true
            })
        })

        it('should not match negatives', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: 3 },
                matches: false
            })
        })
    })

    describe('$gt', () => {
        it('should match greater', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $gt: 3 } },
                matches: true
            })
        })

        it('should not match equal', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $gt: 5 } },
                matches: false
            })
        })

        it('should not match less', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $gt: 7 } },
                matches: false
            })
        })

        it('should reject non-number values', () => {
            testValidation({
                filter: { test: { $gt: 'bla' } },
                result: { valid: false, field: 'test', operator: '$gt', message: 'should compare with a number' }
            })
        })
    })

    describe('$ge', () => {
        it('should match greater', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $ge: 3 } },
                matches: true
            })
        })

        it('should match equal', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $ge: 5 } },
                matches: true
            })
        })

        it('should not match less', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $ge: 7 } },
                matches: false
            })
        })

        it('should reject non-number values', () => {
            testValidation({
                filter: { test: { $ge: 'bla' } },
                result: { valid: false, field: 'test', operator: '$ge', message: 'should compare with a number' }
            })
        })
    })

    describe('$lt', () => {
        it('should match less', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $lt: 7 } },
                matches: true
            })
        })

        it('should not match equal', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $lt: 5 } },
                matches: false
            })
        })

        it('should not match greater', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $lt: 3 } },
                matches: false
            })
        })

        it('should reject non-number values', () => {
            testValidation({
                filter: { test: { $lt: 'bla' } },
                result: { valid: false, field: 'test', operator: '$lt', message: 'should compare with a number' }
            })
        })
    })

    describe('$le', () => {
        it('should match less', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $le: 7 } },
                matches: true
            })
        })

        it('should match equal', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $le: 5 } },
                matches: true
            })
        })

        it('should not match greater', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $le: 3 } },
                matches: false
            })
        })

        it('should reject non-number values', () => {
            testValidation({
                filter: { test: { $le: 'bla' } },
                result: { valid: false, field: 'test', operator: '$le', message: 'should compare with a number' }
            })
        })
    })

    describe('$in', () => {
        it('should match positives', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $in: [2, 5, 8] } },
                matches: true
            })
        })

        it('should not match negatives', () => {
            testMatch({
                object: { foo: 5 },
                filter: { foo: { $in: [2, 8] } },
                matches: false
            })
        })

        it('should reject $in operations without an array value', () => {
            testValidation({
                filter: { test: { $in: 'bla' } },
                result: { valid: false, field: 'test', operator: '$in', message: '$in operator found without array' }
            })
        })

        it('should reject $in operations with non number or string values', () => {
            testValidation({
                filter: { test: { $in: [{ bla: 5 }] } },
                result: { valid: false, field: 'test', operator: '$in', message: '$in operator must only have string and number values' }
            })
        })
    })

    describe('validation', () => {
        it('should reject non-existing $ operations', () => {
            testValidation({
                filter: { test: { $bla: 5 } },
                result: { valid: false, message: `found invalid operator for field 'test': $bla` }
            })
        })

        it('should reject field names starting with a $', () => {
            testValidation({
                filter: { $bla: 5 },
                result: { valid: false, message: 'found field name starting with $: $bla' }
            })
        })
    })
})
