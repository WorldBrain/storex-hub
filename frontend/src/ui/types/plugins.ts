import { PluginInfo } from "@worldbrain/storex-hub-interfaces/lib/plugins";

export type DisplayedPluginInfo = Pick<PluginInfo, 'name' | 'description' | 'identifier' | 'siteUrl'> & {
    installed: boolean
    status: DefaultPluginStatus
    | InstallActionPluginStatus
    | EnableActionPluginStatus
    | DistableActionPluginStatus
}

type DefaultPluginStatus = 'enabled' | 'disabled' | 'available'
type InstallActionPluginStatus = 'installing' | 'successfully-installed' | 'installed-but-errored' | 'could-not-install'
type EnableActionPluginStatus = 'enabling' | 'successfully-enabled' | 'enabled-but-errored' | 'could-not-enable'
type DistableActionPluginStatus = 'disabling' | 'disable-pending' | 'could-not-disable'
