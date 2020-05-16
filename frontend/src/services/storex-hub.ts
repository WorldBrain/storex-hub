import { StorexHubApi_v0, StorexHubCallbacks_v0 } from '@worldbrain/storex-hub/lib/public-api'
import { LocalStorageService } from './local-storage';

export default class StorexHubService {
    private client?: StorexHubApi_v0

    constructor(private options: {
        createClient: (options: { callbacks: Partial<StorexHubCallbacks_v0> }) => Promise<StorexHubApi_v0>
        localStorage: LocalStorageService,
    }) { }

    async getClient(): Promise<StorexHubApi_v0> {
        if (!this.client) {
            this.client = await this.setupClient()
        }
        return this.client
    }

    async setupClient(): Promise<StorexHubApi_v0> {
        const client = await this.options.createClient({
            callbacks: {}
        })

        const existingKey = await this.options.localStorage.getItem('access-token')
        if (existingKey) {
            const result = await client.identifyApp({ name: 'org.worldbrain.storex.interface', accessToken: existingKey })
            if (result.status !== 'success') {
                throw new Error(`Error during app identification: ${result.status}`)
            }
        } else {
            const result = await client.registerApp({ name: 'org.worldbrain.storex.interface', identify: true })
            if (result.status !== 'success') {
                throw new Error(`Error during app registration: ${result.status}`)
            }
            await this.options.localStorage.setItem('access-token', result.accessToken)
        }

        return client
    }
}
