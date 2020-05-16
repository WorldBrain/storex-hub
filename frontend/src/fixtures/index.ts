import fsModule from 'fs'
import { StorexHubApi_v0 } from "@worldbrain/storex-hub/lib/public-api";
import { PluginInfo } from '@worldbrain/storex-hub-interfaces/lib/plugins';

export async function insertStorexHubFixtures(createClient: () => Promise<StorexHubApi_v0>, options: { fs: typeof fsModule }) {
    const { fs } = options
    const management = await createClient()
    fs.mkdirSync('/plugins/org.arweave')
    const arweavePluginInfo: PluginInfo = {
        version: '0.0.1',
        name: 'Arweave',
        identifier: 'org.arweave',
        mainPath: 'main.js',
        entryFunction: 'main',
        siteUrl: 'https://www.arweave.org/',
        description: 'Provides permanent, censorship-resistant storage for your data',
    }
    fs.writeFileSync('/plugins/org.arweave/manifest.json', JSON.stringify(arweavePluginInfo))
    await management.installPlugin({
        identifier: 'org.arweave'
    })

    const arweave = await createClient()
    await arweave.registerApp({ name: 'org.arweave', remote: true, identify: true })
    arweave.describeAppSettings({
        description: {
            layout: {
                sections: [
                    {
                        title: "General",
                        contents: [{ field: "walletKey" }],
                    },
                    {
                        title: "Sharing",
                        contents: [
                            {
                                group: {
                                    title:
                                        "Sync the follow Memex collections to Arweave",
                                    fields: [
                                        { field: "publishTags" },
                                        { field: "includeWebArchiveForTags" },
                                    ],
                                },
                            },
                            { field: "publishLists" },
                        ],
                    },
                ],
            },
            fields: {
                walletKey: {
                    type: "string",
                    label: "Arweave JWT key",
                    widget: { type: "text-input" },
                },
                publishTags: {
                    type: "array",
                    label:
                        "Push all content with the following Memex tags to Arweave",
                    children: { type: "string" },
                    widget: { type: "tag-input" },
                },
                includeWebArchiveForTags: {
                    type: "boolean",
                    label: "Include web archives",
                    widget: { type: "checkbox" },
                },
                publishLists: {
                    type: "array",
                    label: "Sync the follow Memex collections to Arweave",
                    children: { type: "number" },
                    widget: { type: "tag-input" },
                },
            },
        }
    })

    fs.mkdirSync('/plugins/org.ipfs')
    const ipfsPluginInfo: PluginInfo = {
        version: '0.0.1',
        name: 'IPFS',
        identifier: 'io.ipfs',
        mainPath: 'main.js',
        entryFunction: 'main',
        siteUrl: 'https://ipfs.io/',
        description: 'Share your data through IPFS and Textile',
    }
    fs.writeFileSync('/plugins/org.ipfs/manifest.json', JSON.stringify(ipfsPluginInfo))
}
