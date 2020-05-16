export type RouteName = 'overview' | 'pluginSettings'
export type RouteMap = { [Name in RouteName]: Route }
export interface Route {
    path: string,
    backLink?: () => { route: RouteName, params?: { [key: string]: string } }
}
export interface RouteLinkOptions {
    route: RouteName;
    params?: { [key: string]: string };
}

const ROUTES: RouteMap = {
    overview: { path: '/' },
    pluginSettings: { path: '/plugin/:identifier/settings', backLink: () => ({ route: 'overview' }) },
}

export default ROUTES
