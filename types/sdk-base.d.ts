declare module 'sdk-base' {
    class SDKBase extends NodeJS.EventEmitter {
        constructor(...args);
        ready();
    }

    export = SDKBase;
}