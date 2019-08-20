import testIdentificationAPI from './identification.tests';
import testCollectionsAPI from './collections.tests';

describe('API tests', () => {
    describe('Application registration and identification', () => {
        testIdentificationAPI()
    })

    describe('Collection registration and data operations', () => {
        testCollectionsAPI()
    })
})
