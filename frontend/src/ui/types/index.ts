import { Services } from "../../services/types";
export * from './logic';

export type UIServices<Requested extends keyof Services> = Pick<Services, Requested>
export type Tag = { id: string | number, name: string }
