export interface LocalStorageService {
    getItem(key: string): Promise<any>
    setItem(key: string, value: any): Promise<void>
}

export class MemoryLocalStorageService implements LocalStorageService {
    items: { [key: string]: any } = {}

    async getItem(key: string) {
        return this.items[key]
    }

    async setItem(key: string, value: any) {
        this.items[key] = value
    }
}

export class BrowserLocalStorageService implements LocalStorageService {
    async getItem(key: string) {
        return localStorage.getItem(key)
    }

    async setItem(key: string, value: any) {
        localStorage.setItem(key, value)
    }
}
