# Storex Hub

Storex Hub is a server, for now meant to be ran locally, allowing different applications to expose and connect their data. For now, it allows individual applications to register and execute operations in other registered applications using Storex operations. This is used in [Memex](https://getmemex.com/) for example to allow other local applications to be written that share stored knowledge, backup to different locations and process stored knowdledge in different ways.

Storex Hub exposes a simple REST and WebSocket API. This allows applications to be written in a variety of languages, although Typescript is the best supported at the moment.

## Getting started

To run Storex Hub, clone this repo and run:

```
DB_PATH=./db.sqlite3 yarn start
```

Then, use to see how different applications can register themselves and do different operations, see [the tests](./ts/tests/). To experiment with Memex data, open it's background tab console and execute

```js
await bgModules.storexHub.connect();
```
