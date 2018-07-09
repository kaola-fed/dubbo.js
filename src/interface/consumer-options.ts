import { RegistryAPIClient } from './../client/create-registry';
export interface ConsumerOptions {
    registry: RegistryAPIClient;
    interfaceName: string;
    dubboVersion: string;
    version: string;
    group: string;
    protocol: string;
    methods: string[];
    serverHosts: string[];
    timeout: number;
    check: boolean;
    pool: any;
}