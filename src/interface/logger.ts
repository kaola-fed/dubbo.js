export interface Logger {
    info();
    warn(...args);
    error();
    debug();
}