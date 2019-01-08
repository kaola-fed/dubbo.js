export interface InvokeOptions {
    __trace?: any;
    entranceEnv?: string;
    rpcMsgId: number;
    beforeInvoke: Function;
    retry?: number;
    timeout?: number;
    mock?: any;
}