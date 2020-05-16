import io from 'socket.io-client'
import { History } from "history";
import { Services } from "./types";
import RouterService from "./router";
import ROUTES from "../routes";
import { StorexHubCallbacks_v0 } from "@worldbrain/storex-hub/lib/public-api";
import { createStorexHubSocketClient } from "@worldbrain/storex-hub/lib/client";
import { createTestApplication } from "@worldbrain/storex-hub/lib/tests/api/index.tests";
import StorexHubService from './storex-hub';
import { MemoryLocalStorageService, BrowserLocalStorageService } from './local-storage';
import { insertStorexHubFixtures } from '../fixtures';

export async function createServices(options: { history: History, inMemory?: boolean }): Promise<Services> {
    const localStorageService = options.inMemory ? new MemoryLocalStorageService() : new BrowserLocalStorageService()
    const { createClient, fs } = await createStorexHubFactory({ inMemory: options.inMemory });
    if (options.inMemory) {
        await insertStorexHubFixtures(createClient, { fs: fs! })
    }
    const storexHub = new StorexHubService({
        createClient,
        localStorage: localStorageService,
    })
    return {
        router: new RouterService({
            history: options.history,
            routes: ROUTES,
        }),
        storexHub,
        localStorage: localStorageService,
    }
}

export async function createStorexHubFactory(options?: { inMemory?: boolean }) {
    if (options?.inMemory) {
        const { application, fs } = await createTestApplication({ storageBackend: 'dexie', inMemoryFs: true })
        await application.setup()
        return {
            createClient: (options?: { callbacks?: Partial<StorexHubCallbacks_v0> }) => {
                return application.api({ callbacks: options?.callbacks as any })
            },
            fs
        }
    } else {
        return {
            createClient: (options?: { callbacks?: Partial<StorexHubCallbacks_v0> }) => {
                const socket = io('/', { forceNew: true })
                return createStorexHubSocketClient(socket, options)
            },
            fs: null
        }
    }
}
