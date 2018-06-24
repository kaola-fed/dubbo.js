import { RegistryAPIClient } from './../client/create-registry';
export interface ConsumerOptions {
    registry: RegistryAPIClient;
    interfaceName: string;
    version: string;
    group: string;
    protocol: string;
    methods: string[];
}