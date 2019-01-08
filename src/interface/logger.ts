export interface Logger {
    info(...args);
    warn(...args);
    error(...args);
    debug(...args);
}