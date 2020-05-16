import RouterService from "./router";
import StorexHubService from "./storex-hub";
import { LocalStorageService } from "./local-storage";

export interface Services {
    router: RouterService
    storexHub: StorexHubService
    localStorage: LocalStorageService
}
