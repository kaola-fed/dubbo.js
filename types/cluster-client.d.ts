declare module 'cluster-client' {
    namespace clusterClient {
        export class APIClientBase extends NodeJS.EventEmitter {
            constructor(...args);
            emit(...args);
            await(...args);
            on(...args);
        }
    }

    export = clusterClient;
}