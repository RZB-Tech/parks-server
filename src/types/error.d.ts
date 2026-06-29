declare interface ErrorConstructor {
    new (message?: string): Error;
    (message?: string | number): Error;
    readonly prototype: Error;
}