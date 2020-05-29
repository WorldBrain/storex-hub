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

    describe('$gt', () => {
        it('should match greater', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $gt: 3 } },
                matches: true
            })
        })

        it('should not match equal', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $gt: 5 } },
                matches: false
            })
        })

        it('should not match less', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $gt: 7 } },
                matches: false
            })
        })
    })

    describe('$ge', () => {
        it('should match greater', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $ge: 3 } },
                matches: true
            })
        })

        it('should match equal', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $ge: 5 } },
                matches: true
            })
        })

        it('should not match less', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $ge: 7 } },
                matches: false
            })
        })
    })

    describe('$lt', () => {
        it('should match less', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $lt: 7 } },
                matches: true
            })
        })

        it('should not match equal', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $lt: 5 } },
                matches: false
            })
        })

        it('should not match greater', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $lt: 3 } },
                matches: false
            })
        })
    })

    describe('$le', () => {
        it('should match less', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $le: 7 } },
                matches: true
            })
        })

        it('should match equal', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $le: 5 } },
                matches: true
            })
        })

        it('should not match greater', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $le: 3 } },
                matches: false
            })
        })
    })

    describe('$in', () => {
        it('should match positives', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $in: [2, 5, 8] } },
                matches: true
            })
        })

        it('should not match negatives', () => {
            test({
                object: { foo: 5 },
                filter: { foo: { $in: [2, 8] } },
                matches: false
            })
        })
    })
})
