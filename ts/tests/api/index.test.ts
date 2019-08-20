import testIdentificationAPI from './identification.tests';
import testCollectionsAPI from './collections.tests';
import testSharedReading from './shared-reading.tests';

describe('API tests', () => {
    describe('Application registration and identification', () => {
        testIdentificationAPI()
    })

    describe('Collection registration and data operations', () => {
        testCollectionsAPI()
    })

    describe('Read access to virtual tables', () => {
        testSharedReading()
    })
})
