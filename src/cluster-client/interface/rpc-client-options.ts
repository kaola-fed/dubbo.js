import { RegistryAPIClient } from './../create-registry';
import { Logger } from '../../interface/logger';

export interface RpcClientOptions {
    registry?: RegistryAPIClient;
    logger?: Logger;
}