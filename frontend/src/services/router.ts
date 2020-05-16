import { EventEmitter } from "events";
import { History } from "history";
import { RouteMap, RouteName } from "../routes"
const Routes = require('routes')

export default class RouterService {
    events = new EventEmitter()

    private router: any = new Routes()

    constructor(private options: { history: History, routes: RouteMap }) {
        const byRoute: { [path: string]: { route?: string } } = {}
        const resolver = (path: string) => {
            return () => {
                const routeEntry = byRoute[path]
                return routeEntry.route
            }
        }

        for (const [name, route] of Object.entries(options.routes)) {
            let routeEntry = byRoute[route.path]
            if (!routeEntry) {
                this.router.addRoute(route.path, resolver(route.path))
                routeEntry = byRoute[route.path] = {}
            }
            routeEntry.route = name
        }

        options.history.listen(() => this.events.emit('change'))
    }

    goTo(route: RouteName, params: { [key: string]: string } = {}, options?: {}) {
        this.options.history.push(this.getUrl(route, params))
        this.events.emit('change')
    }

    getUrl(route: RouteName, params: { [key: string]: string } = {}, options?: {}): string {
        const routeConfig = this.options.routes[route]
        if (!routeConfig) {
            throw new Error(`No such route ${route}`)
        }

        let url = routeConfig.path
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`:${key}`, value)
        }

        return url
    }

    matchCurrentUrl(): { route: RouteName, params: { [key: string]: string } } {
        const parsed = this.matchUrl(window.location.href)
        if (!parsed) {
            throw new Error(`Tried to parse current URL, both are no routes matching current URL`)
        }
        return parsed
    }

    matchUrl(url: string): { route: RouteName, params: { [key: string]: string } } | null {
        const urlObject = new URL(url)

        let path = urlObject.pathname
        if (path.startsWith(process.env.PUBLIC_URL)) {
            path = path.substr(process.env.PUBLIC_URL.length)
        }
        if (!path.length) {
            path = '/'
        }


        const match = this.router.match(path)
        if (!match) {
            return null
        }
        return { route: match.fn(), params: match.params }
    }
}
