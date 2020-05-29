import expect from "expect"
import { matchObject } from "./match-object"

describe('Match object', () => {
    function test(options: { object: { [key: string]: any }, filter: { [key: string]: any }, matches: boolean }) {
        expect(matchObject(options)).toEqual({ matches: options.matches })
    }

    describe('equality clauses', () => {
        it('should match exact matches', () => {
            test({
                object: { foo: 5 },
                filter: { foo: 5 },
                matches: true
            })
        })

        it('should match subsets', () => {
            test({
                object: { foo: 5, bar: 7 },
                filter: { foo: 5 },
                matches: true
            })
        })

        it('should not match negatives', () => {
            test({
                object: { foo: 5 },
                filter: { foo: 3 },
                matches: false
            })
        })
    })

    describe('greater than clauses', () => {
        it('should match positives', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $gt: 3 } },
                matches: true
            })
        })

        it('should not match negatives', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $gt: 7 } },
                matches: false
            })
        })
    })
})
