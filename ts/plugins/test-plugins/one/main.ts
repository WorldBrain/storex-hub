import { StorexHubApi_v0 } from "../../../public-api";
import { PluginEntryFunction } from "../../types";

export const main: PluginEntryFunction = async (input: { api: StorexHubApi_v0 }) => {
    return {
        start: async () => { console.log('starting plugin!') },
        stop: async () => { console.log('stopping plugin!') }
    }
}
