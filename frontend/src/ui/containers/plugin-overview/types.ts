import { Services } from "../../../services/types";
import { UITaskState } from "../../utils/logic";
import { DisplayedPluginInfo } from "../../types/plugins";

export interface PluginOverviewDependencies {
    services: Pick<Services, "router" | "storexHub">;
}

export interface PluginOverviewState {
    loadState: UITaskState
    loadError?: string
    installedPlugins: Array<DisplayedPluginInfo>
    availablePlugins: Array<DisplayedPluginInfo>
}

export interface PluginOverviewHandlers {
    installPlugin(event: { identifier: string }): void
    enablePlugin(event: { identifier: string }): void
    disablePlugin(event: { identifier: string }): void
}
