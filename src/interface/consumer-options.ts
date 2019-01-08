import { RegistryAPIClient } from './../client/create-registry';
export interface ConsumerOptions {
    registry: RegistryAPIClient;
    entranceEnv: string;
    interfaceName: string;
    jsonRpcVersion: string;
    dubboVersion: string;
    version: string;
    group: string;
    protocol: string;
    methods: string[];
    serverHosts: string[];
    rpcMsgId: number;
    timeout: number;
    check: boolean;
    pool: any;
    circuitBreaker: any;
}