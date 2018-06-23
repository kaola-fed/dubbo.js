import { Logger } from './logger';

export interface ZKClientOptions {
    logger: Logger;
    zookeeper?: any;
    root?: string;
    zkHosts: string;
}