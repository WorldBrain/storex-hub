# StorexHub
StorexHub is an offline-first & open-source Zapier with the ability for language independent custom processing of data.

Its primary use is now to enable users to work with Memex data outside of the browser, e.g. to build custom integrations with their favorite apps, data model imports/exports and transport protocols (e.g. IPFS). But really it can be used to connect any app with each other.

StorexHub is a server, for now meant to be ran locally, allowing different applications to expose and connect their data. For now, it allows individual applications to register and execute operations in other registered applications using [Storex](http://github.com/worldbrain/storex) operations. This is used in [Memex](https://getmemex.com/) for example to allow other local applications to be written that share stored knowledge, backup to different locations and process stored knowdledge in different ways.

Storex Hub exposes a simple REST and WebSocket API. This allows applications to be written in a variety of languages, although Typescript is the best supported at the moment.

[How to get started](https://worldbrain.github.io/storex-docs/#/storex-hub/getting-started/)

[Support the development on OpenCollective](https://opencollective.com/worldbrain/contribute/fund-storexhub-15428)
